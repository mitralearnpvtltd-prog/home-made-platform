import { UnauthorizedException } from '@nestjs/common';
import { DEV_ADMIN_FIXED_OTP, OTP_MAX_ATTEMPTS } from './otp.constants';
import { OtpService } from './otp.service';

describe('OtpService development admin fixed OTP', () => {
  const adminPhone = '9876500001';
  const customerPhone = '9876500002';
  const adminProfileId = 'profile-admin-1';
  const adminRoleId = 'role-admin-1';

  function build(options: {
    nodeEnv: string;
    processNodeEnv?: string;
    configuredPhone: string;
    hasAdminRole: boolean;
    challenge?: Record<string, unknown> | null;
  }) {
    const aquaSms = {
      renderOtpMessage: jest.fn((otp: string) => `OTP ${otp}`),
      sendTransactionalSms: jest.fn().mockResolvedValue({
        ok: true,
        providerStatus: '200',
        messageId: 'dev-msgid',
      }),
    };

    let insertedHash: string | null = null;

    const admin = {
      from: jest.fn((table: string) => {
        if (table === 'auth_otp_challenges') {
          return {
            insert: jest.fn(async (row: { otp_hash: string }) => {
              insertedHash = row.otp_hash;
              return { error: null };
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    is: jest.fn().mockResolvedValue({ error: null }),
                  }),
                }),
                is: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                      maybeSingle: jest.fn().mockResolvedValue({
                        data: { id: 'c1' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  is: jest.fn().mockReturnValue({
                    is: jest.fn().mockReturnValue({
                      order: jest.fn().mockReturnValue({
                        limit: jest.fn().mockReturnValue({
                          maybeSingle: jest.fn().mockResolvedValue({
                            data: options.challenge ?? null,
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: options.hasAdminRole
                    ? { id: adminProfileId }
                    : null,
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { id: adminRoleId },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'user_roles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: options.hasAdminRole
                      ? { profile_id: adminProfileId }
                      : null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'nodeEnv') return options.nodeEnv;
        if (key === 'devAdminOtp.phone10') return options.configuredPhone;
        return undefined;
      }),
    };

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = options.processNodeEnv ?? options.nodeEnv;

    const service = new OtpService(
      {
        isConfigured: true,
        url: 'http://localhost',
        anonKey: 'anon',
        serviceRoleKey: 'service-role-secret',
      } as never,
      admin as never,
      aquaSms as never,
      configService as never,
    );

    return {
      service,
      aquaSms,
      admin,
      getInsertedHash: () => insertedHash,
      restoreEnv: () => {
        process.env.NODE_ENV = previousNodeEnv;
      },
    };
  }

  afterEach(() => {
    // Individual tests restore via restoreEnv when needed.
  });

  it('issues fixed OTP 1234 and skips AquaSMS for configured admin in development', async () => {
    const ctx = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    try {
      expect(ctx.service.isDevAdminFixedOtpEnabled()).toBe(true);
      await ctx.service.issueAndSendOtp({
        phone: adminPhone,
        purpose: 'login',
        requestIp: '127.0.0.1',
      });
      expect(ctx.aquaSms.sendTransactionalSms).not.toHaveBeenCalled();
      const expected = ctx.service.hashOtp({
        otp: DEV_ADMIN_FIXED_OTP,
        phone10: adminPhone,
        purpose: 'login',
      });
      expect(ctx.getInsertedHash()).toBe(expected);
    } finally {
      ctx.restoreEnv();
    }
  });

  it('accepts 1234 for configured admin login in development', async () => {
    const helper = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    const otpHash = helper.service.hashOtp({
      otp: DEV_ADMIN_FIXED_OTP,
      phone10: adminPhone,
      purpose: 'login',
    });
    helper.restoreEnv();

    const ctx = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
      challenge: {
        id: 'c1',
        phone_e164: `+91${adminPhone}`,
        phone10: adminPhone,
        purpose: 'login',
        otp_hash: otpHash,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        attempt_count: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
        consumed_at: null,
        invalidated_at: null,
        created_at: new Date().toISOString(),
      },
    });
    try {
      await expect(
        ctx.service.consumeOtp({
          phone: adminPhone,
          purpose: 'login',
          otp: DEV_ADMIN_FIXED_OTP,
        }),
      ).resolves.toBeUndefined();
    } finally {
      ctx.restoreEnv();
    }
  });

  it('still sends AquaSMS for ordinary customer phones in development', async () => {
    const ctx = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    try {
      await ctx.service.issueAndSendOtp({
        phone: customerPhone,
        purpose: 'login',
        requestIp: '127.0.0.1',
      });
      expect(ctx.aquaSms.sendTransactionalSms).toHaveBeenCalledTimes(1);
      const inserted = ctx.getInsertedHash();
      const fixedHash = ctx.service.hashOtp({
        otp: DEV_ADMIN_FIXED_OTP,
        phone10: customerPhone,
        purpose: 'login',
      });
      expect(inserted).not.toBe(fixedHash);
    } finally {
      ctx.restoreEnv();
    }
  });

  it('never uses fixed OTP 1234 for registration even on the admin phone', async () => {
    const ctx = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    try {
      await ctx.service.issueAndSendOtp({
        phone: adminPhone,
        purpose: 'register',
        requestIp: '127.0.0.1',
      });
      expect(ctx.aquaSms.sendTransactionalSms).toHaveBeenCalledTimes(1);
      const inserted = ctx.getInsertedHash();
      const fixedHash = ctx.service.hashOtp({
        otp: DEV_ADMIN_FIXED_OTP,
        phone10: adminPhone,
        purpose: 'register',
      });
      expect(inserted).not.toBe(fixedHash);
    } finally {
      ctx.restoreEnv();
    }
  });

  it('rejects fixed OTP 1234 for ordinary customers', async () => {
    const helper = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    const randomHash = helper.service.hashOtp({
      otp: '5678',
      phone10: customerPhone,
      purpose: 'login',
    });
    helper.restoreEnv();

    const ctx = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: false,
      challenge: {
        id: 'c1',
        phone_e164: `+91${customerPhone}`,
        phone10: customerPhone,
        purpose: 'login',
        otp_hash: randomHash,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        attempt_count: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
        consumed_at: null,
        invalidated_at: null,
        created_at: new Date().toISOString(),
      },
    });
    try {
      await expect(
        ctx.service.consumeOtp({
          phone: customerPhone,
          purpose: 'login',
          otp: DEV_ADMIN_FIXED_OTP,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    } finally {
      ctx.restoreEnv();
    }
  });

  it('never enables fixed OTP in production even when phone env is set', async () => {
    const ctx = build({
      nodeEnv: 'production',
      processNodeEnv: 'production',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    try {
      expect(ctx.service.isDevAdminFixedOtpEnabled()).toBe(false);
      await ctx.service.issueAndSendOtp({
        phone: adminPhone,
        purpose: 'login',
        requestIp: '127.0.0.1',
      });
      expect(ctx.aquaSms.sendTransactionalSms).toHaveBeenCalledTimes(1);
      const inserted = ctx.getInsertedHash();
      const fixedHash = ctx.service.hashOtp({
        otp: DEV_ADMIN_FIXED_OTP,
        phone10: adminPhone,
        purpose: 'login',
      });
      // Random OTP should almost never equal fixed hash; allow rare collision by checking SMS was sent.
      expect(ctx.aquaSms.sendTransactionalSms).toHaveBeenCalled();
      if (inserted === fixedHash) {
        // Extremely unlikely; still assert SMS path was taken.
        expect(ctx.aquaSms.renderOtpMessage).toHaveBeenCalled();
      }
    } finally {
      ctx.restoreEnv();
    }
  });

  it('rejects fixed OTP path when admin role is missing', async () => {
    const helper = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: true,
    });
    const otpHash = helper.service.hashOtp({
      otp: DEV_ADMIN_FIXED_OTP,
      phone10: adminPhone,
      purpose: 'login',
    });
    helper.restoreEnv();

    const ctx = build({
      nodeEnv: 'development',
      configuredPhone: adminPhone,
      hasAdminRole: false,
      challenge: {
        id: 'c1',
        phone_e164: `+91${adminPhone}`,
        phone10: adminPhone,
        purpose: 'login',
        otp_hash: otpHash,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        attempt_count: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
        consumed_at: null,
        invalidated_at: null,
        created_at: new Date().toISOString(),
      },
    });
    try {
      await expect(
        ctx.service.consumeOtp({
          phone: adminPhone,
          purpose: 'login',
          otp: DEV_ADMIN_FIXED_OTP,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    } finally {
      ctx.restoreEnv();
    }
  });
});

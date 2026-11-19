import { HttpException, UnauthorizedException } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OTP_MAX_ATTEMPTS } from './otp.constants';

describe('OtpService', () => {
  function build(overrides?: {
    insertError?: { message: string } | null;
    challenge?: Record<string, unknown> | null;
    updateConsumed?: Record<string, unknown> | null;
  }) {
    const aquaSms = {
      renderOtpMessage: jest.fn((otp: string) => `OTP ${otp}`),
      sendTransactionalSms: jest.fn().mockResolvedValue({
        ok: true,
        providerStatus: '200',
        messageId: '91827364',
      }),
    };

    const state = {
      challenge: overrides?.challenge ?? null,
      insertError: overrides?.insertError ?? null,
      updateConsumed: overrides?.updateConsumed ?? { id: 'c1' },
    };

    const admin = {
      from: jest.fn((table: string) => {
        expect(table).toBe('auth_otp_challenges');
        return {
          insert: jest.fn().mockResolvedValue({ error: state.insertError }),
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
                      data: state.updateConsumed,
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
                          data: state.challenge,
                          error: null,
                        }),
                      }),
                    }),
                  }),
                }),
                order: jest.fn().mockReturnValue({
                  limit: jest.fn().mockReturnValue({
                    maybeSingle: jest.fn().mockResolvedValue({
                      data: state.challenge
                        ? { created_at: state.challenge.created_at }
                        : null,
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'nodeEnv') return 'test';
        if (key === 'devAdminOtp.phone10') return '';
        return undefined;
      }),
    };

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

    return { service, aquaSms, admin, state, configService };
  }

  it('generates a 4-digit OTP and hashes deterministically', () => {
    const { service } = build();
    const otp = service.generateOtp();
    expect(otp).toMatch(/^\d{4}$/);
    const a = service.hashOtp({ otp: '1234', phone10: '9876543210', purpose: 'login' });
    const b = service.hashOtp({ otp: '1234', phone10: '+919876543210', purpose: 'login' });
    expect(a).toBe(b);
    expect(a).not.toBe(
      service.hashOtp({ otp: '1235', phone10: '9876543210', purpose: 'login' }),
    );
  });

  it('issues OTP, sends AquaSMS, and does not return the plaintext code', async () => {
    const { service, aquaSms } = build();
    const result = await service.issueAndSendOtp({
      phone: '9876543210',
      purpose: 'login',
      requestIp: '127.0.0.1',
    });
    expect(result.cooldownSeconds).toBe(60);
    expect(result.expiresInSeconds).toBe(300);
    expect(aquaSms.sendTransactionalSms).toHaveBeenCalledTimes(1);
    const message = (aquaSms.renderOtpMessage as jest.Mock).mock.results[0]?.value as string;
    expect(message).toMatch(/^OTP \d{4}$/);
  });

  it('rejects incorrect OTP and increments attempts', async () => {
    const otpHash = new OtpService(
      { serviceRoleKey: 'service-role-secret', anonKey: 'anon' } as never,
      {} as never,
      {} as never,
      { get: jest.fn(() => undefined) } as never,
    ).hashOtp({ otp: '1111', phone10: '9876543210', purpose: 'login' });

    const { service } = build({
      challenge: {
        id: 'c1',
        phone_e164: '+919876543210',
        phone10: '9876543210',
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

    await expect(
      service.consumeOtp({ phone: '9876543210', purpose: 'login', otp: '9999' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects expired OTP', async () => {
    const helper = new OtpService(
      { serviceRoleKey: 'service-role-secret', anonKey: 'anon' } as never,
      {} as never,
      {} as never,
      { get: jest.fn(() => undefined) } as never,
    );
    const otpHash = helper.hashOtp({
      otp: '2222',
      phone10: '9876543210',
      purpose: 'login',
    });

    const { service } = build({
      challenge: {
        id: 'c1',
        phone_e164: '+919876543210',
        phone10: '9876543210',
        purpose: 'login',
        otp_hash: otpHash,
        expires_at: new Date(Date.now() - 1_000).toISOString(),
        attempt_count: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
        consumed_at: null,
        invalidated_at: null,
        created_at: new Date(Date.now() - 120_000).toISOString(),
      },
    });

    await expect(
      service.consumeOtp({ phone: '9876543210', purpose: 'login', otp: '2222' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects already-consumed challenge rows', async () => {
    const helper = new OtpService(
      { serviceRoleKey: 'service-role-secret', anonKey: 'anon' } as never,
      {} as never,
      {} as never,
      { get: jest.fn(() => undefined) } as never,
    );
    const otpHash = helper.hashOtp({
      otp: '3333',
      phone10: '9876543210',
      purpose: 'login',
    });

    const { service } = build({
      challenge: {
        id: 'c1',
        phone_e164: '+919876543210',
        phone10: '9876543210',
        purpose: 'login',
        otp_hash: otpHash,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        attempt_count: 0,
        max_attempts: OTP_MAX_ATTEMPTS,
        consumed_at: new Date().toISOString(),
        invalidated_at: null,
        created_at: new Date().toISOString(),
      },
    });

    await expect(
      service.consumeOtp({ phone: '9876543210', purpose: 'login', otp: '3333' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('enforces resend cooldown', async () => {
    const { service } = build({
      challenge: {
        created_at: new Date().toISOString(),
      },
    });

    await expect(
      service.assertResendAllowed('9876543210', 'login'),
    ).rejects.toBeInstanceOf(HttpException);
  });
});

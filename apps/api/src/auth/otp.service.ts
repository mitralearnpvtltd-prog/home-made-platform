import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AquaSmsService } from '../sms/aquasms.service';
import {
  SUPABASE_ADMIN_CLIENT,
  SUPABASE_CONFIG,
} from '../supabase/supabase.constants';
import type { SupabaseRuntimeConfig } from '../supabase/supabase.types';
import {
  DEV_ADMIN_FIXED_OTP,
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_MAX_PER_IP,
  OTP_RATE_LIMIT_MAX_PER_PHONE,
  OTP_RATE_LIMIT_WINDOW_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type OtpPurpose,
} from './otp.constants';
import { normalizeIndianPhone, toE164India } from './auth.utils';

type OtpChallengeRow = {
  id: string;
  phone_e164: string;
  phone10: string;
  purpose: OtpPurpose;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
  max_attempts: number;
  consumed_at: string | null;
  invalidated_at: string | null;
  created_at: string;
};

type RateBucket = { count: number; resetAt: number };

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly phoneBuckets = new Map<string, RateBucket>();
  private readonly ipBuckets = new Map<string, RateBucket>();

  constructor(
    @Inject(SUPABASE_CONFIG) private readonly config: SupabaseRuntimeConfig,
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly admin: SupabaseClient | null,
    private readonly aquaSms: AquaSmsService,
    private readonly configService: ConfigService,
  ) {}


  enforceRequestRateLimits(phone: string, requestIp?: string | null): void {
    const phone10 = this.requirePhone10(phone);
    this.assertRateLimits(phone10, requestIp);
  }

  noteRequestRateLimits(phone: string, requestIp?: string | null): void {
    const phone10 = this.requirePhone10(phone);
    this.bumpRateLimit(this.phoneBuckets, `phone:${phone10}`);
    if (requestIp) {
      this.bumpRateLimit(this.ipBuckets, `ip:${requestIp}`);
    }
  }

  async issueAndSendOtp(input: {
    phone: string;
    purpose: OtpPurpose;
    requestIp?: string | null;
    /** When false, skip SMS but still create a challenge (tests only). */
    deliverSms?: boolean;
  }): Promise<{ cooldownSeconds: number; expiresInSeconds: number }> {
    const phone10 = this.requirePhone10(input.phone);
    const phoneE164 = toE164India(phone10);
    this.assertRateLimits(phone10, input.requestIp);

    const admin = this.requireAdmin();
    await this.invalidateActiveChallenges(admin, phone10, input.purpose);

    let otp = this.generateOtp();
    let skipSms = input.deliverSms === false;
    if (
      input.purpose === 'login' &&
      this.isDevAdminFixedOtpEnabled() &&
      this.isConfiguredDevAdminPhone(phone10)
    ) {
      const hasAdminRole = await this.profileHasAdminRole(phone10);
      if (hasAdminRole) {
        otp = DEV_ADMIN_FIXED_OTP;
        skipSms = true;
        this.logger.log(
          'Dev admin fixed OTP challenge created; AquaSMS skipped for configured admin account',
        );
      }
    }

    const otpHash = this.hashOtp({ otp, phone10, purpose: input.purpose });
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { error: insertError } = await admin.from('auth_otp_challenges').insert({
      phone_e164: phoneE164,
      phone10,
      purpose: input.purpose,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      max_attempts: OTP_MAX_ATTEMPTS,
      request_ip: input.requestIp?.slice(0, 64) ?? null,
    });

    if (insertError) {
      throw new ServiceUnavailableException(
        `Unable to create OTP challenge. Apply migration 20261129000000_auth_otp_challenges.sql if needed. (${insertError.message})`,
      );
    }

    if (!skipSms) {
      const message = this.aquaSms.renderOtpMessage(otp);
      const smsResult = await this.aquaSms.sendTransactionalSms({
        phone10,
        message,
      });
      this.logger.log(
        `OTP SMS submitted purpose=${input.purpose} phoneTail=${phone10.slice(-4)} msgid=${smsResult.messageId ?? 'missing'} submissionOnly=true`,
      );
    }

    this.noteRequestRateLimits(phone10, input.requestIp);

    return {
      cooldownSeconds: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
      expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
    };
  }

  /**
   * Verifies OTP and marks the challenge consumed (single-use).
   * Throws UnauthorizedException for invalid/expired/used/locked codes.
   */
  async consumeOtp(input: {
    phone: string;
    purpose: OtpPurpose;
    otp: string;
  }): Promise<void> {
    const phone10 = this.requirePhone10(input.phone);
    const otp = String(input.otp ?? '').trim();
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
      throw new UnauthorizedException(
        "That OTP isn't correct. Check the code and try again.",
      );
    }

    const admin = this.requireAdmin();
    const challenge = await this.findLatestActiveChallenge(
      admin,
      phone10,
      input.purpose,
    );

    if (!challenge) {
      throw new UnauthorizedException(
        "That OTP isn't correct. Check the code and try again.",
      );
    }

    if (challenge.consumed_at || challenge.invalidated_at) {
      throw new UnauthorizedException(
        'This OTP was already used. Request a new code.',
      );
    }

    if (Date.parse(challenge.expires_at) <= Date.now()) {
      await admin
        .from('auth_otp_challenges')
        .update({ invalidated_at: new Date().toISOString() })
        .eq('id', challenge.id);
      throw new UnauthorizedException(
        'This OTP has expired. Request a new code.',
      );
    }

    if (challenge.attempt_count >= challenge.max_attempts) {
      throw new UnauthorizedException(
        'Too many incorrect attempts. Request a new code.',
      );
    }

    const expectedHash = this.hashOtp({
      otp,
      phone10,
      purpose: input.purpose,
    });
    const matches = this.hashesMatch(expectedHash, challenge.otp_hash);

    if (!matches) {
      const nextAttempts = challenge.attempt_count + 1;
      await admin
        .from('auth_otp_challenges')
        .update({
          attempt_count: nextAttempts,
          updated_at: new Date().toISOString(),
          ...(nextAttempts >= challenge.max_attempts
            ? { invalidated_at: new Date().toISOString() }
            : {}),
        })
        .eq('id', challenge.id);

      throw new UnauthorizedException(
        "That OTP isn't correct. Check the code and try again.",
      );
    }

    // Extra gate for the local fixed OTP: require the live admin role even if the
    // challenge hash matched (role may have been revoked after issue).
    if (this.isDevAdminFixedOtpAttempt(phone10, otp, input.purpose)) {
      const hasAdminRole = await this.profileHasAdminRole(phone10);
      if (!hasAdminRole) {
        throw new UnauthorizedException(
          "That OTP isn't correct. Check the code and try again.",
        );
      }
    }

    const { data: consumed, error } = await admin
      .from('auth_otp_challenges')
      .update({
        consumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', challenge.id)
      .is('consumed_at', null)
      .is('invalidated_at', null)
      .select('id')
      .maybeSingle();

    if (error || !consumed) {
      throw new UnauthorizedException(
        'This OTP was already used. Request a new code.',
      );
    }
  }

  async assertResendAllowed(phone: string, purpose: OtpPurpose): Promise<void> {
    const phone10 = this.requirePhone10(phone);
    const admin = this.requireAdmin();
    const { data, error } = await admin
      .from('auth_otp_challenges')
      .select('created_at')
      .eq('phone10', phone10)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        `Unable to check OTP cooldown: ${error.message}`,
      );
    }

    if (!data?.created_at) return;
    const elapsed = Date.now() - Date.parse(data.created_at);
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Please wait ${wait} seconds before requesting another OTP.`,
          cooldownSeconds: wait,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  generateOtp(): string {
    const max = 10 ** OTP_LENGTH;
    return String(randomInt(0, max)).padStart(OTP_LENGTH, '0');
  }

  hashOtp(input: { otp: string; phone10: string; purpose: OtpPurpose }): string {
    const pepper = process.env.OTP_HASH_PEPPER?.trim();
    if (!pepper) {
      // Never fall back to the public anon key. Prefer an explicit pepper;
      // service-role material is an emergency fallback for local/dev only.
      const fallback = this.config.serviceRoleKey?.trim();
      if (!fallback) {
        throw new ServiceUnavailableException(
          'OTP_HASH_PEPPER must be set on the API (or SUPABASE_SERVICE_ROLE_KEY for local fallback).',
        );
      }
      return createHash('sha256')
        .update(
          `${normalizeIndianPhone(input.phone10)}|${input.purpose}|${input.otp}|${fallback}`,
        )
        .digest('hex');
    }
    return createHash('sha256')
      .update(
        `${normalizeIndianPhone(input.phone10)}|${input.purpose}|${input.otp}|${pepper}`,
      )
      .digest('hex');
  }

  private hashesMatch(left: string, right: string): boolean {
    try {
      const a = Buffer.from(left, 'utf8');
      const b = Buffer.from(right, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private requirePhone10(phone: string): string {
    const phone10 = normalizeIndianPhone(phone);
    if (phone10.length !== 10) {
      throw new BadRequestException(
        'phone must be a 10-digit Indian mobile number',
      );
    }
    return phone10;
  }

  private requireAdmin(): SupabaseClient {
    if (!this.admin) {
      throw new ServiceUnavailableException(
        'OTP verification requires SUPABASE_SERVICE_ROLE_KEY on the API server.',
      );
    }
    return this.admin;
  }

  /** Hard-disabled in production even if DEV_ADMIN_OTP_PHONE is set. */
  isDevAdminFixedOtpEnabled(): boolean {
    if (this.isProductionRuntime()) {
      return false;
    }
    const nodeEnv = (
      this.configService.get<string>('nodeEnv') ??
      process.env.NODE_ENV ??
      'development'
    ).toLowerCase();
    if (nodeEnv !== 'development' && nodeEnv !== 'test') {
      return false;
    }
    return this.getConfiguredDevAdminPhone10().length === 10;
  }

  private isProductionRuntime(): boolean {
    const fromProcess = (process.env.NODE_ENV ?? '').toLowerCase();
    const fromConfig = (
      this.configService.get<string>('nodeEnv') ?? ''
    ).toLowerCase();
    return fromProcess === 'production' || fromConfig === 'production';
  }

  private getConfiguredDevAdminPhone10(): string {
    const configured =
      this.configService.get<string>('devAdminOtp.phone10')?.trim() ?? '';
    return normalizeIndianPhone(configured);
  }

  private isConfiguredDevAdminPhone(phone10: string): boolean {
    const configured = this.getConfiguredDevAdminPhone10();
    return configured.length === 10 && configured === phone10;
  }

  private isDevAdminFixedOtpAttempt(
    phone10: string,
    otp: string,
    purpose: OtpPurpose,
  ): boolean {
    return (
      purpose === 'login' &&
      otp === DEV_ADMIN_FIXED_OTP &&
      this.isDevAdminFixedOtpEnabled() &&
      this.isConfiguredDevAdminPhone(phone10)
    );
  }

  private async profileHasAdminRole(phone10: string): Promise<boolean> {
    const client = this.requireAdmin();
    const e164 = toE164India(phone10);
    const variants = Array.from(
      new Set([phone10, e164, `91${phone10}`].filter(Boolean)),
    );

    let profileId: string | null = null;
    for (const value of variants) {
      const { data, error } = await client
        .from('profiles')
        .select('id')
        .eq('phone', value)
        .maybeSingle();
      if (error) {
        throw new ServiceUnavailableException(
          'Unable to verify administrator account for development OTP.',
        );
      }
      if (data?.id) {
        profileId = String(data.id);
        break;
      }
    }
    if (!profileId) {
      return false;
    }

    const { data: role, error: roleError } = await client
      .from('roles')
      .select('id')
      .eq('code', 'admin')
      .maybeSingle();
    if (roleError) {
      this.logger.error(
        `Dev-admin role catalogue lookup failed code=${roleError.code ?? 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Unable to verify administrator role for development OTP.',
      );
    }
    if (!role?.id) {
      return false;
    }

    const { data: assignment, error: assignError } = await client
      .from('user_roles')
      .select('profile_id')
      .eq('profile_id', profileId)
      .eq('role_id', role.id)
      .maybeSingle();
    if (assignError) {
      this.logger.error(
        `Dev-admin user_roles lookup failed code=${assignError.code ?? 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Unable to verify administrator role for development OTP.',
      );
    }
    return Boolean(assignment);
  }

  private async invalidateActiveChallenges(
    admin: SupabaseClient,
    phone10: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    await admin
      .from('auth_otp_challenges')
      .update({
        invalidated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('phone10', phone10)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .is('invalidated_at', null);
  }

  private async findLatestActiveChallenge(
    admin: SupabaseClient,
    phone10: string,
    purpose: OtpPurpose,
  ): Promise<OtpChallengeRow | null> {
    const { data, error } = await admin
      .from('auth_otp_challenges')
      .select(
        'id, phone_e164, phone10, purpose, otp_hash, expires_at, attempt_count, max_attempts, consumed_at, invalidated_at, created_at',
      )
      .eq('phone10', phone10)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .is('invalidated_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        `Unable to load OTP challenge: ${error.message}`,
      );
    }

    return (data as OtpChallengeRow | null) ?? null;
  }

  private assertRateLimits(phone10: string, requestIp?: string | null): void {
    this.consumeRateBucket(
      this.phoneBuckets,
      `phone:${phone10}`,
      OTP_RATE_LIMIT_MAX_PER_PHONE,
      'Too many OTP requests for this mobile number. Please try again later.',
    );
    if (requestIp) {
      this.consumeRateBucket(
        this.ipBuckets,
        `ip:${requestIp}`,
        OTP_RATE_LIMIT_MAX_PER_IP,
        'Too many OTP requests from this network. Please try again later.',
      );
    }
  }

  private consumeRateBucket(
    store: Map<string, RateBucket>,
    key: string,
    max: number,
    message: string,
  ): void {
    const now = Date.now();
    const bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 0, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS });
      return;
    }
    if (bucket.count >= max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private bumpRateLimit(store: Map<string, RateBucket>, key: string): void {
    const now = Date.now();
    const bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS });
      return;
    }
    bucket.count += 1;
  }
}

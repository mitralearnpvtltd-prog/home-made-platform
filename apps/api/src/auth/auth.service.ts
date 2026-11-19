import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { createSupabaseUserClient } from '../supabase/supabase-admin.client';
import {
  SUPABASE_ADMIN_CLIENT,
  SUPABASE_CLIENT,
  SUPABASE_CONFIG,
} from '../supabase/supabase.constants';
import type { SupabaseRuntimeConfig } from '../supabase/supabase.types';
import type {
  AuthResponseDto,
  AuthSessionDto,
  ProfileDto,
  ProfileRow,
} from './auth.types';
import {
  deriveAccountPassword,
  normalizeIndianPhone,
  toE164India,
} from './auth.utils';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(SUPABASE_CONFIG) private readonly config: SupabaseRuntimeConfig,
    @Inject(SUPABASE_CLIENT) private readonly anon: SupabaseClient | null,
    @Inject(SUPABASE_ADMIN_CLIENT) private readonly admin: SupabaseClient | null,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Issues a hashed OTP challenge and sends it via AquaSMS.
   * Login purpose never reveals whether the number is registered.
   */
  async sendOtp(
    dto: SendOtpDto,
    requestIp?: string | null,
  ): Promise<{ ok: true; cooldownSeconds: number; expiresInSeconds: number }> {
    this.assertConfigured();
    const phone10 = normalizeIndianPhone(dto.phone);
    if (phone10.length !== 10) {
      throw new BadRequestException(
        'phone must be a 10-digit Indian mobile number',
      );
    }

    this.logger.log(
      `OTP send request received purpose=${dto.purpose} phoneTail=${phone10.slice(-4)}`,
    );

    await this.otpService.assertResendAllowed(phone10, dto.purpose);

    if (dto.purpose === 'register') {
      const fullName = (dto.fullName ?? '').trim();
      const email = (dto.email ?? '').trim().toLowerCase();
      if (fullName.length < 2) {
        throw new BadRequestException('fullName is required for registration OTP');
      }
      if (!email) {
        throw new BadRequestException('email is required for registration OTP');
      }
      if (this.admin) {
        const existing = await this.findProfileByPhoneOrEmail(
          toE164India(phone10),
          email,
        );
        if (existing) {
          throw new ConflictException(
            'An account with this mobile number or email already exists. Please log in.',
          );
        }
      }
      const result = await this.otpService.issueAndSendOtp({
        phone: phone10,
        purpose: 'register',
        requestIp,
      });
      this.logger.log(
        `OTP send completed purpose=register phoneTail=${phone10.slice(-4)} smsDispatched=true`,
      );
      return { ok: true, ...result };
    }

    // Login: send SMS only when an account exists; always return the same shape.
    let shouldSend = false;
    if (this.admin) {
      const profile = await this.findProfileByPhone(
        this.admin,
        toE164India(phone10),
      );
      shouldSend = Boolean(profile?.email);
      if (!shouldSend) {
        const authUser = await this.findAuthUserByPhone(phone10);
        shouldSend = Boolean(authUser?.email);
      }
    }

    if (shouldSend) {
      const result = await this.otpService.issueAndSendOtp({
        phone: phone10,
        purpose: 'login',
        requestIp,
      });
      this.logger.log(
        `OTP send completed purpose=login phoneTail=${phone10.slice(-4)} smsDispatched=true`,
      );
      return { ok: true, ...result };
    }

    // Uniform response — do not disclose registration status.
    this.otpService.enforceRequestRateLimits(phone10, requestIp);
    this.otpService.noteRequestRateLimits(phone10, requestIp);
    this.logger.log(
      `OTP send completed purpose=login phoneTail=${phone10.slice(-4)} smsDispatched=false reason=no_matching_account`,
    );
    return {
      ok: true,
      cooldownSeconds: 60,
      expiresInSeconds: 300,
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    await this.otpService.consumeOtp({
      phone: dto.phone,
      purpose: 'register',
      otp: dto.otp,
    });
    this.assertConfigured();
    const anon = this.requireAnon();

    const fullName = dto.fullName.trim();
    const phone10 = normalizeIndianPhone(dto.phone);
    if (phone10.length !== 10) {
      throw new BadRequestException(
        'phone must be a 10-digit Indian mobile number',
      );
    }
    const email = dto.email.trim().toLowerCase();
    const phoneE164 = toE164India(phone10);
    const password = this.accountPassword(phone10, email);

    if (this.admin) {
      const existing = await this.findProfileByPhoneOrEmail(phoneE164, email);
      if (existing) {
        throw new ConflictException(
          'An account with this mobile number or email already exists. Please log in.',
        );
      }

      const { data: created, error: createError } =
        await this.admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          phone: phoneE164,
          phone_confirm: true,
          user_metadata: {
            full_name: fullName,
            phone: phoneE164,
          },
        });

      if (createError || !created.user) {
        throw this.mapAuthWriteError(
          createError?.message ?? 'Unable to create account',
        );
      }

      let profile: ProfileRow;
      try {
        profile = await this.upsertProfileRow(this.admin, {
          id: created.user.id,
          full_name: fullName,
          phone: phoneE164,
          email,
          avatar_url: null,
        });
      } catch (error) {
        // Avoid orphaned auth.users when profiles grants/RLS are not applied yet.
        await this.admin.auth.admin.deleteUser(created.user.id);
        throw error;
      }

      const session = await this.signInWithPassword(anon, email, password);
      return { profile: this.toProfileDto(profile), session };
    }

    // Fallback when service role is not configured: public signUp (needs Confirm email OFF).
    const { data: signedUp, error: signUpError } = await anon.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phoneE164,
        },
      },
    });

    if (signUpError || !signedUp.user) {
      throw this.mapAuthWriteError(
        signUpError?.message ?? 'Unable to create account',
      );
    }

    if (!signedUp.session) {
      throw new ServiceUnavailableException(
        'Account was created in Supabase Auth, but no session was returned (email confirmation is likely enabled). Set SUPABASE_SERVICE_ROLE_KEY on the API, or disable Confirm email in Supabase Auth settings.',
      );
    }

    const profile = await this.upsertOwnProfile(signedUp.session.access_token, {
      id: signedUp.user.id,
      full_name: fullName,
      phone: phoneE164,
      email,
      avatar_url: null,
    });

    return {
      profile: this.toProfileDto(profile),
      session: this.toSessionDto(signedUp.session),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    await this.otpService.consumeOtp({
      phone: dto.phone,
      purpose: 'login',
      otp: dto.otp,
    });
    this.assertConfigured();
    const anon = this.requireAnon();

    const phone10 = normalizeIndianPhone(dto.phone);
    if (phone10.length !== 10) {
      throw new BadRequestException(
        'phone must be a 10-digit Indian mobile number',
      );
    }
    const phoneE164 = toE164India(phone10);

    if (!this.admin) {
      throw new ServiceUnavailableException(
        'Phone login requires SUPABASE_SERVICE_ROLE_KEY on the API server (to resolve the account by mobile number securely).',
      );
    }

    let profile = await this.findProfileByPhone(this.admin, phoneE164);

    // Auth user exists but profiles row is missing — rebuild from Auth claims.
    if (!profile) {
      const authUser = await this.findAuthUserByPhone(phone10);
      if (!authUser?.email) {
        throw new UnauthorizedException(
          "That OTP isn't correct. Check the code and try again.",
        );
      }
      profile = await this.upsertProfileRow(this.admin, {
        id: authUser.id,
        full_name:
          typeof authUser.user_metadata?.full_name === 'string'
            ? authUser.user_metadata.full_name
            : null,
        phone: phoneE164,
        email: authUser.email.toLowerCase(),
        avatar_url: null,
      });
    }

    if (!profile.email) {
      throw new UnauthorizedException(
        "That OTP isn't correct. Check the code and try again.",
      );
    }

    const password = this.accountPassword(phone10, profile.email);
    let session: AuthSessionDto;
    try {
      session = await this.signInWithPassword(anon, profile.email, password);
    } catch {
      const { error } = await this.admin.auth.admin.updateUserById(profile.id, {
        password,
        email_confirm: true,
        phone: phoneE164,
        phone_confirm: true,
        user_metadata: {
          full_name: profile.full_name,
          phone: phoneE164,
        },
      });
      if (error) {
        throw new UnauthorizedException(
          'Unable to sign in with this mobile number. Please try again or register.',
        );
      }
      session = await this.signInWithPassword(anon, profile.email, password);
    }

    const fresh = await this.upsertProfileRow(this.admin, {
      id: profile.id,
      full_name: profile.full_name,
      phone: phoneE164,
      email: profile.email,
      avatar_url: profile.avatar_url,
    });

    return { profile: this.toProfileDto(fresh), session };
  }

  async getProfile(accessToken: string): Promise<ProfileDto> {
    const user = await this.requireUserFromToken(accessToken);
    const row = await this.readOwnProfile(user.id, accessToken);

    if (row) {
      return this.toProfileDto(row);
    }

    // Missing profile row for an authenticated user — create from Auth claims.
    const shell: ProfileRow = {
      id: user.id,
      full_name:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : null,
      phone:
        typeof user.user_metadata?.phone === 'string'
          ? user.user_metadata.phone
          : (user.phone ?? null),
      email: user.email?.toLowerCase() ?? null,
      avatar_url: null,
    };

    if (shell.phone) {
      try {
        shell.phone = toE164India(shell.phone);
      } catch {
        // keep raw phone if normalization fails
      }
    }

    if (this.admin) {
      return this.toProfileDto(await this.upsertProfileRow(this.admin, shell));
    }

    return this.toProfileDto(
      await this.upsertOwnProfile(accessToken, shell),
    );
  }

  async updateProfile(
    accessToken: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    const user = await this.requireUserFromToken(accessToken);

    const patch: Partial<ProfileRow> = { id: user.id };
    if (dto.fullName !== undefined) patch.full_name = dto.fullName.trim();
    if (dto.phone !== undefined) {
      const phone10 = normalizeIndianPhone(dto.phone);
      if (phone10.length !== 10) {
        throw new BadRequestException(
          'phone must be a 10-digit Indian mobile number',
        );
      }
      patch.phone = toE164India(phone10);
    }
    if (dto.email !== undefined) patch.email = dto.email.trim().toLowerCase();

    if (Object.keys(patch).length === 1) {
      return this.getProfile(accessToken);
    }

    const existing = await this.readOwnProfile(user.id, accessToken);
    const next: ProfileRow = {
      id: user.id,
      full_name: patch.full_name ?? existing?.full_name ?? null,
      phone: patch.phone ?? existing?.phone ?? null,
      email: patch.email ?? existing?.email ?? null,
      avatar_url: existing?.avatar_url ?? null,
    };

    await this.assertProfileIdentifiersAvailable(user.id, next);

    // Prefer RLS user client; fall back to admin for the verified caller's own row only.
    try {
      const client = this.userClient(accessToken);
      const { data, error } = await client
        .from('profiles')
        .upsert(next, { onConflict: 'id' })
        .select('id, full_name, phone, email, avatar_url')
        .single();
      if (!error && data) {
        return this.toProfileDto(data as ProfileRow);
      }
      if (error && !this.admin) {
        throw new BadRequestException(
          error.message || 'Unable to update profile',
        );
      }
    } catch (error) {
      if (!this.admin) {
        if (error instanceof BadRequestException) throw error;
        throw new BadRequestException('Unable to update profile');
      }
    }

    if (!this.admin) {
      throw new BadRequestException('Unable to update profile');
    }

    return this.toProfileDto(await this.upsertProfileRow(this.admin, next));
  }

  private async readOwnProfile(
    userId: string,
    accessToken: string,
  ): Promise<ProfileRow | null> {
    try {
      const client = this.userClient(accessToken);
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, phone, email, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      if (!error && data) {
        return data as ProfileRow;
      }
    } catch {
      // fall through
    }

    if (!this.admin) {
      return null;
    }

    const { data, error } = await this.admin
      .from('profiles')
      .select('id, full_name, phone, email, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        `Unable to load profile: ${error.message}`,
      );
    }

    return (data as ProfileRow | null) ?? null;
  }

  async requireUserFromToken(accessToken: string): Promise<User> {
    this.assertConfigured();
    const anon = this.requireAnon();
    const { data, error } = await anon.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new UnauthorizedException(
        'Invalid or expired session. Please log in again.',
      );
    }
    return data.user;
  }

  private assertConfigured(): void {
    if (!this.config.isConfigured) {
      throw new ServiceUnavailableException(
        'Authentication is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the API.',
      );
    }
  }

  private requireAnon(): SupabaseClient {
    if (!this.anon) {
      throw new ServiceUnavailableException(
        'Authentication is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the API.',
      );
    }
    return this.anon;
  }

  private userClient(accessToken: string): SupabaseClient {
    const client = createSupabaseUserClient(this.config, accessToken);
    if (!client) {
      throw new ServiceUnavailableException(
        'Unable to create authenticated database client.',
      );
    }
    return client;
  }

  private accountPassword(phone10: string, email: string): string {
    const secret =
      this.config.serviceRoleKey ||
      this.config.anonKey ||
      'aahaa-dev-password-secret';
    return deriveAccountPassword({ phone10, email, secret });
  }

  private mapAuthWriteError(message: string): never {
    if (/already|registered|exists/i.test(message)) {
      throw new ConflictException(
        'An account with this email or mobile number already exists. Please log in.',
      );
    }
    if (/rate limit|too many/i.test(message)) {
      throw new BadRequestException(
        'Too many sign-up attempts. Please wait a few minutes and try again.',
      );
    }
    throw new BadRequestException(message);
  }

  private async signInWithPassword(
    client: SupabaseClient,
    email: string,
    password: string,
  ): Promise<AuthSessionDto> {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session) {
      throw new UnauthorizedException(
        error?.message ?? 'Unable to create a signed-in session.',
      );
    }
    return this.toSessionDto(data.session);
  }

  private async assertProfileIdentifiersAvailable(
    userId: string,
    next: ProfileRow,
  ): Promise<void> {
    if (!this.admin) {
      return;
    }

    if (next.email) {
      const { data: byEmail } = await this.admin
        .from('profiles')
        .select('id')
        .ilike('email', next.email)
        .neq('id', userId)
        .maybeSingle();
      if (byEmail) {
        throw new ConflictException(
          'Another account already uses this email address.',
        );
      }
    }

    if (next.phone) {
      const other = await this.findProfileByPhone(this.admin, next.phone);
      if (other && other.id !== userId) {
        throw new ConflictException(
          'Another account already uses this mobile number.',
        );
      }
    }
  }

  private async findProfileByPhoneOrEmail(
    phoneE164: string,
    email: string,
  ): Promise<ProfileRow | null> {
    if (!this.admin) {
      return null;
    }

    const { data: byEmail } = await this.admin
      .from('profiles')
      .select('id, full_name, phone, email, avatar_url')
      .ilike('email', email)
      .maybeSingle();
    if (byEmail) return byEmail as ProfileRow;

    return this.findProfileByPhone(this.admin, phoneE164);
  }

  private async findProfileByPhone(
    client: SupabaseClient,
    phone: string,
  ): Promise<ProfileRow | null> {
    const phone10 = normalizeIndianPhone(phone);
    const e164 = toE164India(phone10);
    const variants = Array.from(
      new Set([phone, phone10, e164, `91${phone10}`].filter(Boolean)),
    );

    for (const value of variants) {
      const { data } = await client
        .from('profiles')
        .select('id, full_name, phone, email, avatar_url')
        .eq('phone', value)
        .maybeSingle();
      if (data) return data as ProfileRow;
    }

    // Fallback: match last 10 digits when stored formats differ.
    const { data: rows } = await client
      .from('profiles')
      .select('id, full_name, phone, email, avatar_url')
      .not('phone', 'is', null)
      .limit(500);

    const match = (rows as ProfileRow[] | null)?.find(
      (row) => normalizeIndianPhone(row.phone ?? '') === phone10,
    );
    return match ?? null;
  }

  /**
   * Locates an Auth user by phone when the profiles row is missing.
   * Used only with the service-role client after JWT/OTP checks.
   */
  private async findAuthUserByPhone(phone10: string): Promise<User | null> {
    if (!this.admin) {
      return null;
    }

    const e164 = toE164India(phone10);
    const perPage = 200;
    const maxPages = 5;

    for (let page = 1; page <= maxPages; page += 1) {
      const { data, error } = await this.admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        throw new ServiceUnavailableException(
          `Unable to look up account: ${error.message}`,
        );
      }

      const users = data.users ?? [];
      const match = users.find((user) => {
        const metaPhone =
          typeof user.user_metadata?.phone === 'string'
            ? user.user_metadata.phone
            : '';
        const candidates = [user.phone ?? '', metaPhone];
        return candidates.some(
          (value) =>
            value &&
            (normalizeIndianPhone(value) === phone10 || value === e164),
        );
      });
      if (match) {
        return match;
      }
      if (users.length < perPage) {
        break;
      }
    }

    return null;
  }

  private async upsertProfileRow(
    client: SupabaseClient,
    row: ProfileRow,
  ): Promise<ProfileRow> {
    const { data, error } = await client
      .from('profiles')
      .upsert(
        {
          id: row.id,
          full_name: row.full_name,
          phone: row.phone,
          email: row.email,
          avatar_url: row.avatar_url,
        },
        { onConflict: 'id' },
      )
      .select('id, full_name, phone, email, avatar_url')
      .single();

    if (error || !data) {
      const message = error?.message ?? 'Unable to save profile details.';
      if (/permission denied/i.test(message)) {
        throw new ServiceUnavailableException(
          'Profile storage is not ready on the database. Apply migrations 20261117000000_profiles_auth_rls.sql and 20261118000000_backfill_missing_profiles.sql (grants + own-row RLS), then retry.',
        );
      }
      throw new BadRequestException(message);
    }

    return data as ProfileRow;
  }

  private async upsertOwnProfile(
    accessToken: string,
    row: ProfileRow,
  ): Promise<ProfileRow> {
    try {
      return await this.upsertProfileRow(this.userClient(accessToken), row);
    } catch (error) {
      if (this.admin) {
        return this.upsertProfileRow(this.admin, row);
      }
      throw error;
    }
  }

  private toProfileDto(row: ProfileRow): ProfileDto {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone,
      email: row.email,
      avatarUrl: row.avatar_url,
    };
  }

  private toSessionDto(session: Session): AuthSessionDto {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in,
      expiresAt: session.expires_at ?? null,
      tokenType: session.token_type,
    };
  }
}

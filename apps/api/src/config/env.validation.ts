import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateIf,
  validateSync,
} from 'class-validator';

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsString()
  API_PREFIX?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @ValidateIf((_, value) => hasText(value))
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  SUPABASE_URL?: string;

  @IsOptional()
  @IsString()
  SUPABASE_ANON_KEY?: string;

  @IsOptional()
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string;

  @IsOptional()
  @IsString()
  CASHFREE_APP_ID?: string;

  @IsOptional()
  @IsString()
  CASHFREE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  CASHFREE_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsIn(['SANDBOX', 'PRODUCTION', 'sandbox', 'production'])
  CASHFREE_ENV?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  CASHFREE_FRONTEND_BASE_URL?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  FRONTEND_BASE_URL?: string;

  @IsOptional()
  @IsString()
  AQUASMS_USERNAME?: string;

  @IsOptional()
  @IsString()
  AQUASMS_API_KEY?: string;

  @IsOptional()
  @IsString()
  AQUASMS_SENDER_NAME?: string;

  @IsOptional()
  @IsString()
  AQUASMS_SMS_TYPE?: string;

  @IsOptional()
  @IsString()
  AQUASMS_PEID?: string;

  @IsOptional()
  @IsString()
  AQUASMS_TEMPLATE_ID?: string;

  @IsOptional()
  @IsString()
  AQUASMS_MESSAGE_TEMPLATE?: string;

  @IsOptional()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  AQUASMS_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  AQUASMS_DIAGNOSTIC_KEY?: string;

  @IsOptional()
  @IsString()
  OTP_HASH_PEPPER?: string;

  /**
   * Local development only. 10-digit Indian mobile for the fixed admin OTP (1234).
   * Ignored when NODE_ENV=production.
   */
  @IsOptional()
  @IsString()
  DEV_ADMIN_OTP_PHONE?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: true,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const url =
    typeof validated.SUPABASE_URL === 'string' ? validated.SUPABASE_URL.trim() : '';
  const anonKey =
    typeof validated.SUPABASE_ANON_KEY === 'string'
      ? validated.SUPABASE_ANON_KEY.trim()
      : '';

  if (Boolean(url) !== Boolean(anonKey)) {
    throw new Error(
      'Invalid environment configuration: SUPABASE_URL and SUPABASE_ANON_KEY must both be set or both be empty.',
    );
  }

  return validated;
}

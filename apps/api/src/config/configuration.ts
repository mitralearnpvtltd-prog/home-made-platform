import { loadApiEnvFile } from './load-api-env';

export type AppConfig = {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  cashfree: {
    appId: string;
    secretKey: string;
    webhookSecret: string;
    env: string;
    frontendBaseUrl: string;
  };
  aquasms: {
    username: string;
    apiKey: string;
    senderName: string;
    smsType: string;
    peid: string;
    templateId: string;
    messageTemplate: string;
    endpoint: string;
    configured: boolean;
  };
  /**
   * Local-only fixed OTP target phone (10 digits). Ignored in production even if set.
   * See DEV_ADMIN_OTP_PHONE in .env.example.
   */
  devAdminOtp: {
    phone10: string;
  };
};

function splitOrigins(value: string | undefined): string[] {
  if (!value?.trim()) {
    return ['http://localhost:5173', 'http://localhost:5174'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default (): AppConfig => {
  // Match scripts/check-cashfree-auth.mjs: file credentials must win over stale process.env.
  loadApiEnvFile({ override: true });

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number.parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigins: splitOrigins(process.env.CORS_ORIGINS),
    supabase: {
      url: process.env.SUPABASE_URL ?? '',
      anonKey: process.env.SUPABASE_ANON_KEY ?? '',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    },
    cashfree: {
      appId: process.env.CASHFREE_APP_ID ?? '',
      secretKey: process.env.CASHFREE_SECRET_KEY ?? '',
      // Prefer dedicated webhook secret; fall back to API secret (Cashfree default).
      webhookSecret:
        process.env.CASHFREE_WEBHOOK_SECRET ??
        process.env.CASHFREE_SECRET_KEY ??
        '',
      env: (process.env.CASHFREE_ENV ?? 'SANDBOX').toUpperCase(),
      frontendBaseUrl:
        process.env.CASHFREE_FRONTEND_BASE_URL ??
        process.env.FRONTEND_BASE_URL ??
        'http://localhost:5173',
    },
    aquasms: (() => {
      const username = (process.env.AQUASMS_USERNAME ?? '').trim();
      const apiKey = (process.env.AQUASMS_API_KEY ?? '').trim();
      const senderName = (process.env.AQUASMS_SENDER_NAME ?? '').trim();
      const smsType = (process.env.AQUASMS_SMS_TYPE ?? 'TRANS').trim() || 'TRANS';
      const peid = (process.env.AQUASMS_PEID ?? '').trim();
      const templateId = (process.env.AQUASMS_TEMPLATE_ID ?? '').trim();
      const messageTemplate = (process.env.AQUASMS_MESSAGE_TEMPLATE ?? '').trim();
      const endpoint = (
        process.env.AQUASMS_ENDPOINT ??
        'https://login.aquasms.com/v2/sendSMS'
      ).trim();
      const configured = Boolean(
        username && apiKey && senderName && peid && templateId && messageTemplate,
      );
      return {
        username,
        apiKey,
        senderName,
        smsType,
        peid,
        templateId,
        messageTemplate,
        endpoint,
        configured,
      };
    })(),
    devAdminOtp: (() => {
      const raw = (process.env.DEV_ADMIN_OTP_PHONE ?? '').trim();
      const digits = raw.replace(/\D/g, '');
      const phone10 =
        digits.length === 12 && digits.startsWith('91')
          ? digits.slice(2)
          : digits.slice(-10);
      return {
        phone10: phone10.length === 10 ? phone10 : '',
      };
    })(),
  };
};

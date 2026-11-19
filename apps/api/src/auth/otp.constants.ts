export const OTP_LENGTH = 4;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const OTP_RATE_LIMIT_MAX_PER_PHONE = 5;
export const OTP_RATE_LIMIT_MAX_PER_IP = 20;

/** Local-development only. Never accepted when NODE_ENV=production. */
export const DEV_ADMIN_FIXED_OTP = '1234';

export type OtpPurpose = 'login' | 'register';

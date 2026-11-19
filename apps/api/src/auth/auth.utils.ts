import { createHash } from 'node:crypto';

export function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits.slice(-10);
}

export function toE164India(phone10: string): string {
  return `+91${normalizeIndianPhone(phone10)}`;
}

export function formatPhoneDisplay(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = normalizeIndianPhone(phone);
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Deterministic account password derived only on the server.
 * Used so phone+OTP login can obtain a Supabase session after Admin createUser.
 */
export function deriveAccountPassword(params: {
  phone10: string;
  email: string;
  secret: string;
}): string {
  const material = `${normalizeIndianPhone(params.phone10).toLowerCase()}|${params.email.trim().toLowerCase()}|${params.secret}`;
  return `Aa1!${createHash('sha256').update(material).digest('hex').slice(0, 48)}`;
}

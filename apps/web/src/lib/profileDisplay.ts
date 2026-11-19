import type { AuthProfile } from "./authSession";

export function normalizePhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits.slice(-10);
}

export function formatProfilePhone(phone: string | null | undefined): string {
  if (!phone) return "Not provided";
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

export function formatProfileName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "Not provided";
}

export function formatProfileEmail(email: string | null | undefined): string {
  const trimmed = email?.trim();
  return trimmed ? trimmed : "Not provided";
}

export function profileToFormState(profile: AuthProfile | null) {
  return {
    name: profile?.fullName?.trim() ?? "",
    phone: profile?.phone ? normalizePhoneDigits(profile.phone) : "",
    email: profile?.email?.trim() ?? "",
  };
}

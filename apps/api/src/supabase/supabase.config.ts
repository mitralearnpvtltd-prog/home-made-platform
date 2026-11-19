import type { SupabaseRuntimeConfig } from './supabase.types';

export type SupabaseEnvInput = {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
};

function normalize(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      return true;
    }
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

/**
 * Builds runtime Supabase config from environment values.
 * Throws on incomplete pairs or invalid URL shapes. Never includes secret values in messages.
 */
export function buildSupabaseRuntimeConfig(
  input: SupabaseEnvInput,
): SupabaseRuntimeConfig {
  const url = normalize(input.url);
  const anonKey = normalize(input.anonKey);
  const serviceRoleKey = normalize(input.serviceRoleKey);

  const hasUrl = url.length > 0;
  const hasAnonKey = anonKey.length > 0;

  if (hasUrl !== hasAnonKey) {
    throw new Error(
      'Incomplete Supabase configuration: both SUPABASE_URL and SUPABASE_ANON_KEY are required together.',
    );
  }

  if (hasUrl && !isValidSupabaseUrl(url)) {
    throw new Error(
      'Invalid SUPABASE_URL: expected an https URL (or http://localhost for local development).',
    );
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    isConfigured: hasUrl && hasAnonKey,
    hasServiceRoleKey: serviceRoleKey.length > 0,
  };
}

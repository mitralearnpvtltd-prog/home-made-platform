import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseRuntimeConfig } from './supabase.types';

/**
 * Privileged server-only Supabase client (service role).
 * Bypasses RLS — use only after explicit authorization checks.
 * Never import or expose this from frontend code.
 */
export function createSupabaseAdminClient(
  config: SupabaseRuntimeConfig,
): SupabaseClient | null {
  if (!config.isConfigured || !config.hasServiceRoleKey) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * User-scoped client that respects RLS for the given access token.
 */
export function createSupabaseUserClient(
  config: SupabaseRuntimeConfig,
  accessToken: string,
): SupabaseClient | null {
  if (!config.isConfigured || !accessToken.trim()) {
    return null;
  }

  return createClient(config.url, config.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

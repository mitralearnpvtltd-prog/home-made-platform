import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseRuntimeConfig } from './supabase.types';

/**
 * Creates the ordinary server-side Supabase client using the publishable/anon key.
 * Returns null when Supabase is not configured so the API can still boot for local work.
 * Never uses the service-role key.
 */
export function createSupabaseAnonClient(
  config: SupabaseRuntimeConfig,
): SupabaseClient | null {
  if (!config.isConfigured) {
    return null;
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

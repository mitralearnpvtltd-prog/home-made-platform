import { createSupabaseAnonClient } from './supabase.client';
import type { SupabaseRuntimeConfig } from './supabase.types';

function config(
  overrides: Partial<SupabaseRuntimeConfig> = {},
): SupabaseRuntimeConfig {
  return {
    url: '',
    anonKey: '',
    serviceRoleKey: '',
    isConfigured: false,
    hasServiceRoleKey: false,
    ...overrides,
  };
}

describe('createSupabaseAnonClient', () => {
  it('returns null when Supabase is not configured', () => {
    expect(createSupabaseAnonClient(config())).toBeNull();
  });

  it('creates a client when URL and anon key are configured', () => {
    const client = createSupabaseAnonClient(
      config({
        url: 'https://example.supabase.co',
        anonKey: 'test-anon-key',
        isConfigured: true,
      }),
    );

    expect(client).not.toBeNull();
    expect(typeof client?.from).toBe('function');
  });

  it('does not use the service-role key when creating the ordinary client', () => {
    const client = createSupabaseAnonClient(
      config({
        url: 'https://example.supabase.co',
        anonKey: 'test-anon-key',
        serviceRoleKey: 'should-not-be-used',
        isConfigured: true,
        hasServiceRoleKey: true,
      }),
    );

    expect(client).not.toBeNull();
    // supabase-js stores the key on the auth headers used by the client; ensure anon key was applied
    // by checking the public key surface without printing secrets.
    const key = (client as unknown as { supabaseKey?: string }).supabaseKey;
    expect(key).toBe('test-anon-key');
    expect(key).not.toBe('should-not-be-used');
  });
});

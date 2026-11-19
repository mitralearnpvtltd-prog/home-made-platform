import { buildSupabaseRuntimeConfig, isValidSupabaseUrl } from './supabase.config';

describe('supabase.config', () => {
  describe('isValidSupabaseUrl', () => {
    it('accepts https project URLs', () => {
      expect(isValidSupabaseUrl('https://example.supabase.co')).toBe(true);
    });

    it('accepts localhost http for local development', () => {
      expect(isValidSupabaseUrl('http://localhost:54321')).toBe(true);
    });

    it('rejects non-url values', () => {
      expect(isValidSupabaseUrl('not-a-url')).toBe(false);
    });
  });

  describe('buildSupabaseRuntimeConfig', () => {
    it('marks unconfigured when both URL and anon key are empty', () => {
      const config = buildSupabaseRuntimeConfig({
        url: '',
        anonKey: '',
        serviceRoleKey: '',
      });

      expect(config.isConfigured).toBe(false);
      expect(config.hasServiceRoleKey).toBe(false);
    });

    it('marks configured with URL and anon key only', () => {
      const config = buildSupabaseRuntimeConfig({
        url: 'https://example.supabase.co',
        anonKey: 'test-anon-key',
        serviceRoleKey: '',
      });

      expect(config.isConfigured).toBe(true);
      expect(config.hasServiceRoleKey).toBe(false);
      expect(config.url).toBe('https://example.supabase.co');
      expect(config.anonKey).toBe('test-anon-key');
    });

    it('does not require a service-role key for readiness', () => {
      const config = buildSupabaseRuntimeConfig({
        url: 'https://example.supabase.co',
        anonKey: 'test-anon-key',
      });

      expect(config.isConfigured).toBe(true);
      expect(config.hasServiceRoleKey).toBe(false);
    });

    it('records service-role presence without changing ordinary readiness rules', () => {
      const config = buildSupabaseRuntimeConfig({
        url: 'https://example.supabase.co',
        anonKey: 'test-anon-key',
        serviceRoleKey: 'service-role-placeholder',
      });

      expect(config.isConfigured).toBe(true);
      expect(config.hasServiceRoleKey).toBe(true);
    });

    it('throws when only the URL is provided', () => {
      expect(() =>
        buildSupabaseRuntimeConfig({
          url: 'https://example.supabase.co',
          anonKey: '',
        }),
      ).toThrow(/both SUPABASE_URL and SUPABASE_ANON_KEY/);
    });

    it('throws when only the anon key is provided', () => {
      expect(() =>
        buildSupabaseRuntimeConfig({
          url: '',
          anonKey: 'test-anon-key',
        }),
      ).toThrow(/both SUPABASE_URL and SUPABASE_ANON_KEY/);
    });

    it('throws for an invalid URL without echoing credentials', () => {
      expect(() =>
        buildSupabaseRuntimeConfig({
          url: 'ftp://bad.example',
          anonKey: 'secret-anon-key-value',
        }),
      ).toThrow(/Invalid SUPABASE_URL/);

      try {
        buildSupabaseRuntimeConfig({
          url: 'ftp://bad.example',
          anonKey: 'secret-anon-key-value',
        });
      } catch (error) {
        expect(String(error)).not.toContain('secret-anon-key-value');
      }
    });
  });
});

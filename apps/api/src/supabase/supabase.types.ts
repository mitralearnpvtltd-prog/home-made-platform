export type SupabaseRuntimeConfig = {
  url: string;
  anonKey: string;
  /** Present only for future privileged server paths; never use for ordinary user ops. */
  serviceRoleKey: string;
  /** True when URL and publishable/anon key are both present and valid. */
  isConfigured: boolean;
  /** True when a service-role key is present; does not affect ordinary client readiness. */
  hasServiceRoleKey: boolean;
};

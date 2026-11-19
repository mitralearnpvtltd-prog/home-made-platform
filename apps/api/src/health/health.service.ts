import { Inject, Injectable } from '@nestjs/common';
import { SUPABASE_CONFIG } from '../supabase/supabase.constants';
import type { SupabaseRuntimeConfig } from '../supabase/supabase.types';

export type HealthStatus = {
  status: 'ok';
  service: string;
  timestamp: string;
  supabaseConfigured: boolean;
};

@Injectable()
export class HealthService {
  constructor(
    @Inject(SUPABASE_CONFIG)
    private readonly supabaseConfig: SupabaseRuntimeConfig,
  ) {}

  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'aahaa-api',
      timestamp: new Date().toISOString(),
      supabaseConfigured: this.supabaseConfig.isConfigured,
    };
  }
}

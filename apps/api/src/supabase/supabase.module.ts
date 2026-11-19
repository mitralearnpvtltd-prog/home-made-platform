import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from './supabase-admin.client';
import { createSupabaseAnonClient } from './supabase.client';
import { buildSupabaseRuntimeConfig } from './supabase.config';
import {
  SUPABASE_ADMIN_CLIENT,
  SUPABASE_CLIENT,
  SUPABASE_CONFIG,
} from './supabase.constants';
import type { SupabaseRuntimeConfig } from './supabase.types';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): SupabaseRuntimeConfig => {
        return buildSupabaseRuntimeConfig({
          url: configService.get<string>('supabase.url'),
          anonKey: configService.get<string>('supabase.anonKey'),
          serviceRoleKey: configService.get<string>('supabase.serviceRoleKey'),
        });
      },
    },
    {
      provide: SUPABASE_CLIENT,
      inject: [SUPABASE_CONFIG],
      useFactory: (config: SupabaseRuntimeConfig): SupabaseClient | null => {
        const logger = new Logger('SupabaseModule');
        const client = createSupabaseAnonClient(config);

        if (client) {
          logger.log('Supabase anon client initialized');
        } else {
          logger.warn(
            'Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY). Client provider is null.',
          );
        }

        return client;
      },
    },
    {
      provide: SUPABASE_ADMIN_CLIENT,
      inject: [SUPABASE_CONFIG],
      useFactory: (config: SupabaseRuntimeConfig): SupabaseClient | null => {
        const logger = new Logger('SupabaseModule');
        const client = createSupabaseAdminClient(config);

        if (client) {
          logger.log('Supabase admin client initialized (service role)');
        } else if (config.isConfigured) {
          logger.warn(
            'SUPABASE_SERVICE_ROLE_KEY is not set. Auth register/login by phone requires it on the API only.',
          );
        }

        return client;
      },
    },
  ],
  exports: [SUPABASE_CONFIG, SUPABASE_CLIENT, SUPABASE_ADMIN_CLIENT],
})
export class SupabaseModule {}

import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants';
import type {
  LocationSearchResult,
  SearchLocationsInput,
} from './locations.types';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

/** Escape %, _, and \ so passenger queries cannot widen ILIKE matches. */
export function escapeIlikePattern(raw: string): string {
  return raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient | null,
  ) {}

  async search(input: SearchLocationsInput): Promise<LocationSearchResult[]> {
    if (!this.supabase) {
      throw new ServiceUnavailableException(
        'Location search is unavailable because Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the API.',
      );
    }

    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const needle = (input.q ?? '').trim();
    const pattern = `%${escapeIlikePattern(needle)}%`;

    const { data, error } = await this.supabase
      .from('locations')
      .select('id, name, city, district, state, location_type')
      .eq('location_type', input.type)
      .eq('is_active', true)
      .ilike('name', pattern)
      .order('name', { ascending: true })
      .limit(limit);

    if (error) {
      this.logger.error(`Location search failed: ${error.message}`);
      if (/permission denied|42501/i.test(error.message)) {
        throw new ServiceUnavailableException(
          'Location catalogue is not readable. Ensure migration 20261113000000_locations_active_select_policy.sql is applied and SELECT is granted to anon/authenticated on public.locations.',
        );
      }
      throw new InternalServerErrorException(
        'Failed to search locations. Please try again.',
      );
    }

    const rows = (data ?? []) as LocationSearchResult[];

    // Defense in depth: never leak the wrong type even if the DB filter misbehaves.
    return rows.filter((row) => row.location_type === input.type);
  }
}

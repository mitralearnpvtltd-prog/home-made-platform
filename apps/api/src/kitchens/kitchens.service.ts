import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants';
import type { KitchenListItem, KitchenQueryRow } from './kitchens.types';

@Injectable()
export class KitchensService {
  private readonly logger = new Logger(KitchensService.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient | null,
  ) {}

  async list(): Promise<KitchenListItem[]> {
    if (!this.supabase) {
      throw new ServiceUnavailableException(
        'Kitchen listing is unavailable because Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the API.',
      );
    }

    const { data, error } = await this.supabase
      .from('kitchens')
      .select(
        `
        id,
        name,
        cook:cooks!inner (
          id,
          blurb,
          offer_label,
          offer_type,
          from_price,
          photo_url,
          has_menu,
          is_verified,
          is_vegetarian,
          rating,
          review_count
        )
      `,
      )
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`Kitchen listing failed: ${error.message}`);
      if (/permission denied|42501/i.test(error.message)) {
        throw new ServiceUnavailableException(
          'Kitchen catalogue is not readable. Ensure cooks/kitchens SELECT policies and grants are applied.',
        );
      }
      throw new InternalServerErrorException(
        'Failed to list kitchens. Please try again.',
      );
    }

    return ((data ?? []) as KitchenQueryRow[]).map((row) => this.mapRow(row));
  }

  private mapRow(row: KitchenQueryRow): KitchenListItem {
    const cook = Array.isArray(row.cook) ? row.cook[0] : row.cook;
    if (!cook) {
      throw new InternalServerErrorException(
        'Kitchen listing returned a kitchen without a cook',
      );
    }

    return {
      id: row.id,
      cookId: cook.id,
      name: row.name,
      blurb: cook.blurb,
      offerLabel: cook.offer_label,
      offerType: cook.offer_type,
      fromPrice:
        cook.from_price === null || cook.from_price === undefined
          ? null
          : Number(cook.from_price),
      photoUrl: cook.photo_url,
      hasMenu: Boolean(cook.has_menu),
      isVerified: Boolean(cook.is_verified),
      // Preserve NULL as unknown; Boolean(null) would incorrectly become false.
      isVegetarian:
        cook.is_vegetarian === null || cook.is_vegetarian === undefined
          ? null
          : Boolean(cook.is_vegetarian),
      rating:
        cook.rating === null || cook.rating === undefined
          ? null
          : Number(cook.rating),
      reviewCount: Number(cook.review_count ?? 0),
    };
  }
}

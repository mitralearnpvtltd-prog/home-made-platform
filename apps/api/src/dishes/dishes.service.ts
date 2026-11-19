import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants';
import type { DishListItem, DishQueryRow, DishSpiceLevel } from './dishes.types';

const DISH_SELECT = `
  id,
  kitchen_id,
  code,
  name,
  price,
  description,
  spice_level,
  sort_order,
  is_available,
  category:food_categories (
    code
  )
`;

const DISH_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

@Injectable()
export class DishesService {
  private readonly logger = new Logger(DishesService.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient | null,
  ) {}

  async listByKitchen(kitchenId: string): Promise<DishListItem[]> {
    const client = this.requireClient();
    await this.assertKitchenExists(client, kitchenId);

    const { data, error } = await client
      .from('dishes')
      .select(DISH_SELECT)
      .eq('kitchen_id', kitchenId)
      .eq('is_available', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      this.throwReadError('Dish listing failed', error.message, 'Failed to list dishes');
    }

    return ((data ?? []) as DishQueryRow[])
      .filter((row) => row.kitchen_id === kitchenId && row.is_available)
      .map((row) => this.mapRow(row));
  }

  async getByKitchenAndCode(
    kitchenId: string,
    code: string,
  ): Promise<DishListItem> {
    const client = this.requireClient();
    await this.assertKitchenExists(client, kitchenId);
    const normalizedCode = this.normalizeDishCode(code);

    const { data, error } = await client
      .from('dishes')
      .select(DISH_SELECT)
      .eq('kitchen_id', kitchenId)
      .eq('code', normalizedCode)
      .eq('is_available', true)
      .maybeSingle();

    if (error) {
      this.throwReadError('Dish lookup failed', error.message, 'Failed to load dish');
    }

    if (!data) {
      // Unavailable dishes are filtered the same as missing — never expose as orderable.
      throw new NotFoundException(
        `Dish "${normalizedCode}" was not found for this kitchen`,
      );
    }

    const row = data as DishQueryRow;
    if (row.kitchen_id !== kitchenId || !row.is_available) {
      throw new NotFoundException(
        `Dish "${normalizedCode}" was not found for this kitchen`,
      );
    }

    return this.mapRow(row);
  }

  private async assertKitchenExists(
    client: SupabaseClient,
    kitchenId: string,
  ): Promise<void> {
    const { data, error } = await client
      .from('kitchens')
      .select('id')
      .eq('id', kitchenId)
      .maybeSingle();

    if (error) {
      this.throwReadError(
        'Kitchen lookup failed',
        error.message,
        'Failed to verify kitchen',
      );
    }

    if (!data) {
      throw new NotFoundException('Kitchen was not found');
    }
  }

  private normalizeDishCode(code: string): string {
    const normalized = code.trim();
    if (!normalized) {
      throw new BadRequestException('Dish code is required');
    }
    if (normalized.length > 80) {
      throw new BadRequestException('Dish code must be at most 80 characters');
    }
    if (!DISH_CODE_PATTERN.test(normalized)) {
      throw new BadRequestException(
        'Dish code must be a slug (letters, numbers, and hyphens)',
      );
    }
    return normalized;
  }

  private requireClient(): SupabaseClient {
    if (!this.supabase) {
      throw new ServiceUnavailableException(
        'Dish catalogue is unavailable because Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY on the API.',
      );
    }
    return this.supabase;
  }

  private throwReadError(
    logMessage: string,
    errorMessage: string,
    fallback: string,
  ): never {
    this.logger.error(`${logMessage}: ${errorMessage}`);
    if (/permission denied|42501/i.test(errorMessage)) {
      throw new ServiceUnavailableException(
        'Menu catalogue is not readable. Ensure kitchens/dishes SELECT grants and available-dish RLS policies are applied.',
      );
    }
    throw new InternalServerErrorException(`${fallback}. Please try again.`);
  }

  private mapRow(row: DishQueryRow): DishListItem {
    const category = Array.isArray(row.category) ? row.category[0] : row.category;
    return {
      id: row.id,
      kitchenId: row.kitchen_id,
      code: row.code,
      name: row.name,
      price: Number(row.price),
      description: row.description,
      spiceLevel: this.mapSpiceLevel(row.spice_level),
      categoryCode: category?.code ?? null,
      sortOrder: Number(row.sort_order ?? 0),
      isAvailable: Boolean(row.is_available),
    };
  }

  private mapSpiceLevel(value: string | null): DishSpiceLevel | null {
    if (value === 'Mild' || value === 'Medium' || value === 'Hot') {
      return value;
    }
    return null;
  }
}

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  SUPABASE_ADMIN_CLIENT,
  SUPABASE_CLIENT,
} from '../supabase/supabase.constants';
import type {
  CartDto,
  CartItemDto,
  CartItemRow,
  CartRow,
  DishCartRow,
} from './cart.types';
import type { AddCartItemDto } from './dto/add-cart-item.dto';
import type { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly anon: SupabaseClient | null,
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly admin: SupabaseClient | null,
  ) {}

  async getCart(userId: string): Promise<CartDto> {
    const client = this.requireAdmin();
    const cart = await this.getOrCreateActiveCart(client, userId);
    return this.buildCartDto(client, cart);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartDto> {
    const client = this.requireAdmin();
    const dish = await this.requireAvailableDish(
      client,
      dto.kitchenId,
      dto.dishCode.trim(),
    );

    // Atomic: lock cart, switch kitchen if needed, upsert/increment qty (cap 99).
    const { error } = await client.rpc('cart_add_item', {
      p_user_id: userId,
      p_kitchen_id: dish.kitchen_id,
      p_dish_id: dish.id,
      p_set_quantity: dto.quantity ?? null,
    });
    if (error) {
      this.throwRpcError(error.message, 'Unable to add item to cart');
    }

    const cart = await this.requireActiveCart(client, userId);
    return this.buildCartDto(client, cart);
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    const client = this.requireAdmin();

    const { data, error } = await client.rpc('cart_set_item_quantity', {
      p_user_id: userId,
      p_item_id: itemId,
      p_quantity: dto.quantity,
    });
    if (error) {
      this.throwRpcError(error.message, 'Unable to update cart item');
    }

    // status: updated | removed | removed_unavailable (removal already committed).
    void data;

    const cart = await this.requireActiveCart(client, userId);
    return this.buildCartDto(client, cart);
  }

  async removeItem(userId: string, itemId: string): Promise<CartDto> {
    return this.updateItem(userId, itemId, { quantity: 0 });
  }

  async clearCart(userId: string): Promise<CartDto> {
    const client = this.requireAdmin();
    const { error } = await client.rpc('cart_clear', { p_user_id: userId });
    if (error) {
      this.throwRpcError(error.message, 'Unable to clear cart');
    }
    const cart = await this.requireActiveCart(client, userId);
    return this.buildCartDto(client, cart);
  }

  private requireAdmin(): SupabaseClient {
    if (!this.admin) {
      throw new ServiceUnavailableException(
        'Cart persistence requires SUPABASE_SERVICE_ROLE_KEY on the API server only.',
      );
    }
    return this.admin;
  }

  private async getOrCreateActiveCart(
    client: SupabaseClient,
    userId: string,
  ): Promise<CartRow> {
    const { data: lockedId, error: lockError } = await client.rpc(
      'cart_lock_active_cart',
      { p_user_id: userId },
    );
    if (lockError || !lockedId) {
      this.throwRpcError(
        lockError?.message ?? 'Unable to create cart',
        'Unable to create cart',
      );
    }

    const { data, error } = await client
      .from('carts')
      .select('id, user_id, kitchen_id, status')
      .eq('id', lockedId as string)
      .single();

    if (error || !data) {
      this.throwWriteError(
        error?.message ?? 'Unable to load cart',
        'Unable to load cart',
      );
    }
    return data as CartRow;
  }

  private async requireActiveCart(
    client: SupabaseClient,
    userId: string,
  ): Promise<CartRow> {
    const cart = await this.findActiveCart(client, userId);
    if (!cart) {
      throw new NotFoundException('No active cart found');
    }
    return cart;
  }

  private async findActiveCart(
    client: SupabaseClient,
    userId: string,
  ): Promise<CartRow | null> {
    const { data, error } = await client
      .from('carts')
      .select('id, user_id, kitchen_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      this.throwWriteError(error.message, 'Unable to load cart');
    }
    return (data as CartRow | null) ?? null;
  }

  private async buildCartDto(
    client: SupabaseClient,
    cart: CartRow,
  ): Promise<CartDto> {
    const { data, error } = await client
      .from('cart_items')
      .select(
        `
        id,
        cart_id,
        dish_id,
        quantity,
        dish:dishes (
          id,
          kitchen_id,
          code,
          name,
          price,
          is_available,
          category:food_categories ( code )
        )
      `,
      )
      .eq('cart_id', cart.id)
      .order('created_at', { ascending: true });

    if (error) {
      this.throwWriteError(error.message, 'Unable to load cart items');
    }

    const items: CartItemDto[] = [];
    const staleIds: string[] = [];

    for (const row of data ?? []) {
      const dishRaw = (row as { dish?: DishCartRow | DishCartRow[] | null }).dish;
      const dish = Array.isArray(dishRaw) ? dishRaw[0] : dishRaw;
      const quantity = Number((row as CartItemRow).quantity);

      if (!dish || !dish.is_available) {
        staleIds.push((row as CartItemRow).id);
        continue;
      }

      const category = Array.isArray(dish.category)
        ? dish.category[0]
        : dish.category;
      const unitPrice = Number(dish.price);
      items.push({
        id: (row as CartItemRow).id,
        dishId: dish.id,
        dishCode: dish.code,
        kitchenId: dish.kitchen_id,
        name: dish.name,
        unitPrice,
        quantity,
        lineTotal: Number((unitPrice * quantity).toFixed(2)),
        categoryCode: category?.code ?? null,
        isAvailable: true,
      });
    }

    if (staleIds.length > 0) {
      for (const staleId of staleIds) {
        await client.rpc('cart_set_item_quantity', {
          p_user_id: cart.user_id,
          p_item_id: staleId,
          p_quantity: 0,
        });
      }
      const refreshed = await this.findActiveCart(client, cart.user_id);
      if (refreshed) {
        cart = refreshed;
      }
    }

    if (items.length === 0 && cart.kitchen_id) {
      await client.rpc('cart_switch_kitchen', {
        p_user_id: cart.user_id,
        p_kitchen_id: null,
      });
      cart.kitchen_id = null;
    }

    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = Number(
      items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
    );

    return {
      id: cart.id,
      kitchenId: cart.kitchen_id,
      status: 'active',
      items,
      itemCount,
      subtotal,
    };
  }

  private async requireAvailableDish(
    client: SupabaseClient,
    kitchenId: string,
    dishCode: string,
  ): Promise<DishCartRow> {
    const { data, error } = await client
      .from('dishes')
      .select(
        `
        id,
        kitchen_id,
        code,
        name,
        price,
        is_available,
        category:food_categories ( code )
      `,
      )
      .eq('kitchen_id', kitchenId)
      .eq('code', dishCode)
      .maybeSingle();

    if (error) {
      this.throwWriteError(error.message, 'Unable to validate dish');
    }
    if (!data) {
      throw new NotFoundException(
        `Dish "${dishCode}" was not found for this kitchen`,
      );
    }
    const dish = data as DishCartRow;
    if (!dish.is_available) {
      throw new BadRequestException(
        'That dish is unavailable and cannot be added to your bag.',
      );
    }
    return dish;
  }

  private throwRpcError(message: string, fallback: string): never {
    if (/dish is unavailable/i.test(message)) {
      throw new BadRequestException(
        'That dish is unavailable and cannot be kept in your bag.',
      );
    }
    if (/cart item not found|dish not found/i.test(message)) {
      throw new NotFoundException(message);
    }
    if (/quantity must be between/i.test(message)) {
      throw new BadRequestException(message);
    }
    this.throwWriteError(message, fallback);
  }

  private throwWriteError(message: string, fallback: string): never {
    if (/permission denied|42501/i.test(message)) {
      throw new ServiceUnavailableException(
        'Cart tables are not ready. Apply migration 20261119000000_carts.sql (including service_role grants), then retry.',
      );
    }
    if (/pg_catalog\.(least|greatest|coalesce)/i.test(message)) {
      throw new ServiceUnavailableException(
        'Cart RPC helpers need a SQL fix. Apply migration 20261121000000_fix_cart_rpc_least_greatest.sql in Supabase, then retry.',
      );
    }
    if (
      /does not exist|relation .*cart|Could not find the table .*carts|function .*cart_/i.test(
        message,
      )
    ) {
      throw new ServiceUnavailableException(
        'Cart tables or RPCs are missing. Apply migration 20261119000000_carts.sql in Supabase, then retry.',
      );
    }
    throw new BadRequestException(message || fallback);
  }
}

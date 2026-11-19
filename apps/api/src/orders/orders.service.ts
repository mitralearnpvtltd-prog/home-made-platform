import {
  BadRequestException,
  ForbiddenException,
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
import type { CreateOrderDto } from './dto/create-order.dto';
import type {
  OrderDto,
  OrderItemDto,
  OrderItemRow,
  OrderListItemDto,
  OrderRow,
  OrderStatus,
  PaymentStatus,
} from './orders.types';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly anon: SupabaseClient | null,
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly admin: SupabaseClient | null,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    const client = this.requireAdmin();

    const journeyFrom = dto.journeyFrom?.trim() ?? '';
    const journeyTo = dto.journeyTo?.trim() ?? '';
    if (!journeyFrom || !journeyTo) {
      throw new BadRequestException(
        'journeyFrom and journeyTo are required so Track Your Order can show the saved journey.',
      );
    }

    const { data: orderId, error } = await client.rpc('order_create_from_cart', {
      p_user_id: userId,
      p_idempotency_key: dto.idempotencyKey.trim(),
      p_collector_name: dto.collectorName.trim(),
      p_collector_phone: dto.collectorPhone.trim(),
      p_collection_point: dto.collectionPoint?.trim() || null,
      p_kitchen_note: dto.kitchenNote?.trim() || null,
      p_pickup_note: dto.pickupNote?.trim() || null,
      p_pickup_stop_name: dto.pickupStopName.trim(),
      p_pickup_time: dto.pickupTime?.trim() || null,
      p_journey_from: journeyFrom,
      p_journey_to: journeyTo,
      p_journey_date: dto.journeyDate?.trim() || null,
      p_bus_number: dto.busNumber?.trim() || null,
      p_seat_number: dto.seatNumber?.trim() || null,
    });

    if (error) {
      this.throwRpcError(error.message, 'Unable to create order');
    }
    if (!orderId || typeof orderId !== 'string') {
      throw new ServiceUnavailableException('Order create did not return an id');
    }

    return this.loadOrderForUser(client, userId, orderId);
  }

  async listOrders(userId: string): Promise<OrderListItemDto[]> {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('orders')
      .select(
        `
        id,
        order_number,
        kitchen_id,
        status,
        payment_status,
        total,
        currency,
        journey_date,
        pickup_time,
        created_at,
        kitchens ( name ),
        order_items ( id, dish_id, dish_code, dish_name, unit_price, quantity, line_total )
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.throwReadError(error.message, 'Unable to load orders');
    }

    const rows = (data ?? []) as Array<
      OrderRow & {
        order_items?: OrderItemRow[] | null;
      }
    >;

    return rows.map((row) => {
      const mappedItems: OrderItemDto[] = (row.order_items ?? []).map((item) => ({
        id: item.id,
        dishId: item.dish_id,
        dishCode: item.dish_code,
        dishName: item.dish_name,
        unitPrice: this.toNumber(item.unit_price),
        quantity: item.quantity,
        lineTotal: this.toNumber(item.line_total),
      }));
      const itemCount = mappedItems.reduce((sum, item) => sum + Number(item.quantity), 0);
      return {
        id: row.id,
        orderNumber: row.order_number,
        kitchenId: row.kitchen_id,
        kitchenName: this.kitchenName(row),
        status: row.status as OrderStatus,
        paymentStatus: row.payment_status as PaymentStatus,
        total: this.toNumber(row.total),
        currency: row.currency,
        itemCount,
        primaryItemName: mappedItems[0]?.dishName ?? null,
        items: mappedItems,
        journeyDate: row.journey_date,
        pickupTime: row.pickup_time,
        createdAt: row.created_at,
      };
    });
  }

  async getOrder(userId: string, orderId: string): Promise<OrderDto> {
    const client = this.requireAdmin();
    return this.loadOrderForUser(client, userId, orderId);
  }

  async deleteOrder(
    userId: string,
    orderId: string,
  ): Promise<{ deleted: true; orderId: string }> {
    const client = this.requireAdmin();
    const { data, error } = await client.rpc('order_delete_for_user', {
      p_user_id: userId,
      p_order_id: orderId,
    });

    if (error) {
      this.throwDeleteError(error.message);
    }

    // RPC returns false when no owned row matched — treat as not found
    // so we never reveal whether another user's order exists.
    if (data !== true) {
      throw new NotFoundException('Order not found');
    }

    return { deleted: true, orderId };
  }

  private async loadOrderForUser(
    client: SupabaseClient,
    userId: string,
    orderId: string,
  ): Promise<OrderDto> {
    const { data, error } = await client
      .from('orders')
      .select(
        `
        *,
        kitchens ( name )
      `,
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      this.throwReadError(error.message, 'Unable to load order');
    }
    if (!data) {
      throw new NotFoundException('Order not found');
    }

    const row = data as OrderRow;
    if (row.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    const { data: itemRows, error: itemsError } = await client
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      this.throwReadError(itemsError.message, 'Unable to load order items');
    }

    return this.toOrderDto(row, (itemRows ?? []) as OrderItemRow[]);
  }

  private toOrderDto(row: OrderRow, items: OrderItemRow[]): OrderDto {
    const mappedItems: OrderItemDto[] = items.map((item) => ({
      id: item.id,
      dishId: item.dish_id,
      dishCode: item.dish_code,
      dishName: item.dish_name,
      unitPrice: this.toNumber(item.unit_price),
      quantity: item.quantity,
      lineTotal: this.toNumber(item.line_total),
    }));

    return {
      id: row.id,
      orderNumber: row.order_number,
      kitchenId: row.kitchen_id,
      kitchenName: this.kitchenName(row),
      status: row.status as OrderStatus,
      paymentStatus: row.payment_status as PaymentStatus,
      collectorName: row.collector_name,
      collectorPhone: row.collector_phone,
      collectionPoint: row.collection_point,
      kitchenNote: row.kitchen_note,
      pickupNote: row.pickup_note,
      pickupStopName: row.pickup_stop_name,
      pickupTime: row.pickup_time,
      journeyFrom: row.journey_from,
      journeyTo: row.journey_to,
      journeyDate: row.journey_date,
      busNumber: row.bus_number ?? null,
      seatNumber: row.seat_number ?? null,
      subtotal: this.toNumber(row.subtotal),
      pickupServiceFee: this.toNumber(row.pickup_service_fee),
      taxAmount: this.toNumber(row.tax_amount),
      total: this.toNumber(row.total),
      currency: row.currency,
      items: mappedItems,
      itemCount: mappedItems.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private kitchenName(row: OrderRow): string | null {
    const raw = row.kitchens;
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0]?.name ?? null;
    return raw.name ?? null;
  }

  private toNumber(value: number | string): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private requireAdmin(): SupabaseClient {
    if (!this.admin) {
      throw new ServiceUnavailableException(
        'Order persistence requires SUPABASE_SERVICE_ROLE_KEY on the API server only.',
      );
    }
    return this.admin;
  }

  private throwRpcError(message: string, fallback: string): never {
    const lower = message.toLowerCase();
    if (/cart is empty/i.test(message)) {
      throw new BadRequestException('Your Meal Bag is empty. Add food before placing an order.');
    }
    if (/unavailable/i.test(message)) {
      throw new BadRequestException(
        'One or more dishes in your Meal Bag are no longer available. Update your bag and try again.',
      );
    }
    if (/another kitchen/i.test(message)) {
      throw new BadRequestException(
        'Your Meal Bag can only contain dishes from one kitchen.',
      );
    }
    if (/collector_|pickup_stop|idempotency|required/i.test(message)) {
      throw new BadRequestException(message);
    }
    if (
      /does not exist|relation .*orders|Could not find the table .*orders|function .*order_create/i.test(
        message,
      )
    ) {
      throw new ServiceUnavailableException(
        'Order tables or RPCs are missing. Apply migration 20261122000000_orders.sql in Supabase, then retry.',
      );
    }
    if (/permission denied|row-level security/i.test(lower)) {
      throw new ServiceUnavailableException(
        'Order RPC permissions are not ready. Re-apply migration 20261122000000_orders.sql (service_role EXECUTE), then retry.',
      );
    }
    throw new BadRequestException(fallback);
  }

  private throwReadError(message: string, fallback: string): never {
    if (
      /does not exist|relation .*orders|Could not find the table .*orders/i.test(
        message,
      )
    ) {
      throw new ServiceUnavailableException(
        'Order tables are missing. Apply migration 20261122000000_orders.sql in Supabase, then retry.',
      );
    }
    throw new ServiceUnavailableException(fallback);
  }

  private throwDeleteError(message: string): never {
    if (
      /does not exist|function .*order_delete_for_user|Could not find the function/i.test(
        message,
      )
    ) {
      throw new ServiceUnavailableException(
        'Order delete RPC is missing. Apply migration 20261126000000_order_delete_for_user.sql in Supabase, then retry.',
      );
    }
    if (/permission denied|row-level security/i.test(message.toLowerCase())) {
      throw new ServiceUnavailableException(
        'Order delete permissions are not ready. Re-apply migration 20261126000000_order_delete_for_user.sql, then retry.',
      );
    }
    this.throwReadError(message, 'Unable to delete order');
  }
}

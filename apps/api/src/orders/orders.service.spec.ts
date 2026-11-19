import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  SUPABASE_ADMIN_CLIENT,
  SUPABASE_CLIENT,
} from '../supabase/supabase.constants';
import { OrdersService } from './orders.service';

const ORDER_ROW = {
  id: 'order-1',
  order_number: 'AHA-20261116-000001',
  user_id: 'user-1',
  kitchen_id: 'kitchen-1',
  source_cart_id: 'cart-1',
  status: 'placed',
  payment_status: 'pending',
  collector_name: 'Ananya Rao',
  collector_phone: '+91 9876543210',
  collection_point: 'Main entrance',
  kitchen_note: null,
  pickup_note: null,
  pickup_stop_name: 'Bangalore',
  pickup_time: '1:00 PM',
  journey_from: 'Chennai',
  journey_to: 'Bangalore',
  journey_date: '2026-10-18',
  bus_number: 'KA-01-AB-1234',
  seat_number: '12A',
  subtotal: 100,
  pickup_service_fee: 0,
  tax_amount: 18,
  total: 118,
  currency: 'INR',
  idempotency_key: 'idem-1',
  created_at: '2026-11-16T00:00:00.000Z',
  updated_at: '2026-11-16T00:00:00.000Z',
  kitchens: { name: "Swathi's Kitchen" },
};

const ITEM_ROW = {
  id: 'item-1',
  order_id: 'order-1',
  dish_id: 'dish-1',
  dish_code: 'lemon-rice',
  dish_name: 'Lemon rice & potato fry',
  unit_price: 100,
  quantity: 1,
  line_total: 100,
};

function mockOrderLoadAdmin(overrides?: {
  orderData?: unknown;
  orderError?: unknown;
  itemsData?: unknown;
  itemsError?: unknown;
  rpc?: jest.Mock;
}) {
  const maybeSingle = jest.fn().mockResolvedValue({
    data: overrides?.orderData === undefined ? ORDER_ROW : overrides.orderData,
    error: overrides?.orderError ?? null,
  });
  const orderEq = jest.fn().mockReturnValue({ maybeSingle });
  const orderSelect = jest.fn().mockReturnValue({ eq: orderEq });

  const itemOrder = jest.fn().mockResolvedValue({
    data: overrides?.itemsData === undefined ? [ITEM_ROW] : overrides.itemsData,
    error: overrides?.itemsError ?? null,
  });
  const itemEq = jest.fn().mockReturnValue({ order: itemOrder });
  const itemSelect = jest.fn().mockReturnValue({ eq: itemEq });

  const from = jest.fn((table: string) => {
    if (table === 'orders') return { select: orderSelect };
    if (table === 'order_items') return { select: itemSelect };
    return { select: jest.fn() };
  });

  const rpc =
    overrides?.rpc ??
    jest.fn().mockResolvedValue({ data: 'order-1', error: null });

  return { from, rpc, maybeSingle, orderEq };
}

describe('OrdersService', () => {
  it('throws when service role is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: null },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(
      service.createOrder('user-1', {
        idempotencyKey: 'idempotency-key-1',
        collectorName: 'Ananya',
        collectorPhone: '9876543210',
        pickupStopName: 'Bangalore',
        journeyFrom: 'Koramangala',
        journeyTo: 'Mysuru',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates an order via order_create_from_cart and returns snapshots', async () => {
    const { from, rpc } = mockOrderLoadAdmin();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    const order = await service.createOrder('user-1', {
      idempotencyKey: 'idempotency-key-1',
      collectorName: 'Ananya Rao',
      collectorPhone: '+91 9876543210',
      pickupStopName: 'Bangalore',
      pickupTime: '1:00 PM',
      journeyFrom: 'Chennai',
      journeyTo: 'Bangalore',
      journeyDate: '2026-10-18',
      busNumber: 'KA-01-AB-1234',
      seatNumber: '12A',
    });

    expect(rpc).toHaveBeenCalledWith(
      'order_create_from_cart',
      expect.objectContaining({
        p_user_id: 'user-1',
        p_idempotency_key: 'idempotency-key-1',
        p_pickup_stop_name: 'Bangalore',
        p_bus_number: 'KA-01-AB-1234',
        p_seat_number: '12A',
      }),
    );
    expect(order.orderNumber).toBe('AHA-20261116-000001');
    expect(order.paymentStatus).toBe('pending');
    expect(order.status).toBe('placed');
    expect(order.subtotal).toBe(100);
    expect(order.pickupServiceFee).toBe(0);
    expect(order.taxAmount).toBe(18);
    expect(order.total).toBe(118);
    expect(order.busNumber).toBe('KA-01-AB-1234');
    expect(order.seatNumber).toBe('12A');
    expect(order.items[0]?.dishName).toBe('Lemon rice & potato fry');
  });

  it('maps empty-cart RPC errors to BadRequestException', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'cart is empty' },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from: jest.fn(), rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(
      service.createOrder('user-1', {
        idempotencyKey: 'idempotency-key-2',
        collectorName: 'Ananya',
        collectorPhone: '9876543210',
        pickupStopName: 'Bangalore',
        journeyFrom: 'Koramangala',
        journeyTo: 'Mysuru',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps unavailable-dish RPC errors to BadRequestException', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'one or more dishes are unavailable' },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from: jest.fn(), rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(
      service.createOrder('user-1', {
        idempotencyKey: 'idempotency-key-3',
        collectorName: 'Ananya',
        collectorPhone: '9876543210',
        pickupStopName: 'Bangalore',
        journeyFrom: 'Koramangala',
        journeyTo: 'Mysuru',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects access to another user order', async () => {
    const { from, rpc } = mockOrderLoadAdmin({
      orderData: { ...ORDER_ROW, user_id: 'user-2' },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(service.getOrder('user-1', 'order-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns 404 when order is missing', async () => {
    const { from, rpc } = mockOrderLoadAdmin({ orderData: null });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(service.getOrder('user-1', 'order-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists only the requested user orders', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          ...ORDER_ROW,
          order_items: [
            {
              id: 'item-1',
              dish_id: null,
              dish_code: 'lemon-rice',
              dish_name: 'Lemon rice & potato fry',
              unit_price: 100,
              quantity: 1,
              line_total: 100,
            },
            {
              id: 'item-2',
              dish_id: null,
              dish_code: 'soft-idli',
              dish_name: 'Soft idli & chutney',
              unit_price: 80,
              quantity: 2,
              line_total: 160,
            },
          ],
        },
      ],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ select });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc: jest.fn() } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    const list = await service.listOrders('user-1');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(list).toHaveLength(1);
    expect(list[0]?.orderNumber).toBe('AHA-20261116-000001');
    expect(list[0]?.primaryItemName).toBe('Lemon rice & potato fry');
    expect(list[0]?.items).toHaveLength(2);
    expect(list[0]?.items[1]?.dishName).toBe('Soft idli & chutney');
    expect(list[0]?.itemCount).toBe(3);
  });

  it('deletes an owned order via RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: true, error: null });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from: jest.fn(), rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(service.deleteOrder('user-1', 'order-1')).resolves.toEqual({
      deleted: true,
      orderId: 'order-1',
    });
    expect(rpc).toHaveBeenCalledWith('order_delete_for_user', {
      p_user_id: 'user-1',
      p_order_id: 'order-1',
    });
  });

  it('returns not found when delete RPC matches no owned row', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: false, error: null });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from: jest.fn(), rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(service.deleteOrder('user-1', 'order-other')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('surfaces missing delete RPC as service unavailable', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'function public.order_delete_for_user(uuid, uuid) does not exist' },
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from: jest.fn(), rpc } },
      ],
    }).compile();

    const service = module.get(OrdersService);
    await expect(service.deleteOrder('user-1', 'order-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});

import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  SUPABASE_ADMIN_CLIENT,
  SUPABASE_CLIENT,
} from '../supabase/supabase.constants';
import { CartService } from './cart.service';

describe('CartService', () => {
  it('throws when service role is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: null },
      ],
    }).compile();

    const service = module.get(CartService);
    await expect(service.getCart('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rejects unavailable dishes before calling cart_add_item', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'dish-1',
        kitchen_id: 'kitchen-1',
        code: 'lemon-rice',
        name: 'Lemon rice',
        price: 100,
        is_available: false,
        category: { code: 'meals' },
      },
      error: null,
    });
    const eq2 = jest.fn().mockReturnValue({ maybeSingle });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const select = jest.fn().mockReturnValue({ eq: eq1 });
    const rpc = jest.fn();
    const from = jest.fn().mockReturnValue({ select });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    await expect(
      service.addItem('user-1', {
        kitchenId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
        dishCode: 'lemon-rice',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns 404 when dish code is unknown', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    const eq2 = jest.fn().mockReturnValue({ maybeSingle });
    const eq1 = jest.fn().mockReturnValue({ eq: eq2 });
    const select = jest.fn().mockReturnValue({ eq: eq1 });
    const rpc = jest.fn();
    const from = jest.fn().mockReturnValue({ select });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    await expect(
      service.addItem('user-1', {
        kitchenId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
        dishCode: 'no-such-dish',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('adds via atomic cart_add_item RPC (kitchen switch + upsert)', async () => {
    const dishMaybe = jest.fn().mockResolvedValue({
      data: {
        id: 'dish-1',
        kitchen_id: 'kitchen-1',
        code: 'lemon-rice',
        name: 'Lemon rice',
        price: 100,
        is_available: true,
        category: { code: 'meals' },
      },
      error: null,
    });
    const dishEq2 = jest.fn().mockReturnValue({ maybeSingle: dishMaybe });
    const dishEq1 = jest.fn().mockReturnValue({ eq: dishEq2 });

    const cartSingle = jest.fn().mockResolvedValue({
      data: {
        id: 'cart-1',
        user_id: 'user-1',
        kitchen_id: 'kitchen-1',
        status: 'active',
      },
      error: null,
    });
    const cartEq = jest.fn().mockReturnValue({ single: cartSingle, maybeSingle: cartSingle });

    const itemsOrder = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'item-1',
          cart_id: 'cart-1',
          dish_id: 'dish-1',
          quantity: 2,
          dish: {
            id: 'dish-1',
            kitchen_id: 'kitchen-1',
            code: 'lemon-rice',
            name: 'Lemon rice',
            price: 100,
            is_available: true,
            category: { code: 'meals' },
          },
        },
      ],
      error: null,
    });
    const itemsEq = jest.fn().mockReturnValue({ order: itemsOrder });

    const select = jest.fn((cols: string) => {
      if (cols.includes('user_id') || cols === 'id, user_id, kitchen_id, status') {
        return { eq: cartEq };
      }
      if (typeof cols === 'string' && cols.includes('is_available')) {
        return { eq: dishEq1 };
      }
      return { eq: itemsEq };
    });

    // from('carts').select(...).eq().maybeSingle used by requireActiveCart
    const from = jest.fn((table: string) => {
      if (table === 'dishes') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({ maybeSingle: dishMaybe }),
            }),
          }),
        };
      }
      if (table === 'carts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'cart-1',
                    user_id: 'user-1',
                    kitchen_id: 'kitchen-1',
                    status: 'active',
                  },
                  error: null,
                }),
              }),
              single: cartSingle,
              maybeSingle: jest.fn().mockResolvedValue({
                data: {
                  id: 'cart-1',
                  user_id: 'user-1',
                  kitchen_id: 'kitchen-1',
                  status: 'active',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: itemsOrder,
          }),
        }),
      };
    });

    const rpc = jest.fn().mockResolvedValue({ data: 'cart-1', error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    const cart = await service.addItem('user-1', {
      kitchenId: 'kitchen-1',
      dishCode: 'lemon-rice',
    });

    expect(rpc).toHaveBeenCalledWith('cart_add_item', {
      p_user_id: 'user-1',
      p_kitchen_id: 'kitchen-1',
      p_dish_id: 'dish-1',
      p_set_quantity: null,
    });
    expect(cart.subtotal).toBe(200);
    expect(cart.items[0]?.quantity).toBe(2);
  });

  it('sets quantity via atomic cart_set_item_quantity RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { cart_id: 'cart-1', status: 'updated' },
      error: null,
    });
    const itemsOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const from = jest.fn((table: string) => {
      if (table === 'carts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'cart-1',
                    user_id: 'user-1',
                    kitchen_id: null,
                    status: 'active',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ order: itemsOrder }),
        }),
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    await service.updateItem('user-1', 'item-1', { quantity: 3 });
    expect(rpc).toHaveBeenCalledWith('cart_set_item_quantity', {
      p_user_id: 'user-1',
      p_item_id: 'item-1',
      p_quantity: 3,
    });
  });

  it('treats removed_unavailable as a committed successful removal', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { cart_id: 'cart-1', status: 'removed_unavailable' },
      error: null,
    });
    const itemsOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const from = jest.fn((table: string) => {
      if (table === 'carts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'cart-1',
                    user_id: 'user-1',
                    kitchen_id: null,
                    status: 'active',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ order: itemsOrder }),
        }),
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    const cart = await service.updateItem('user-1', 'item-1', { quantity: 2 });
    expect(cart.items).toEqual([]);
    expect(rpc).toHaveBeenCalledWith('cart_set_item_quantity', {
      p_user_id: 'user-1',
      p_item_id: 'item-1',
      p_quantity: 2,
    });
  });

  it('clears via atomic cart_clear RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'cart-1', error: null });
    const itemsOrder = jest.fn().mockResolvedValue({ data: [], error: null });
    const from = jest.fn((table: string) => {
      if (table === 'carts') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: {
                    id: 'cart-1',
                    user_id: 'user-1',
                    kitchen_id: null,
                    status: 'active',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ order: itemsOrder }),
        }),
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    const cart = await service.clearCart('user-1');
    expect(rpc).toHaveBeenCalledWith('cart_clear', { p_user_id: 'user-1' });
    expect(cart.items).toEqual([]);
    expect(cart.subtotal).toBe(0);
  });

  it('maps RPC quantity validation errors to 400', async () => {
    const dishMaybe = jest.fn().mockResolvedValue({
      data: {
        id: 'dish-1',
        kitchen_id: 'kitchen-1',
        code: 'lemon-rice',
        name: 'Lemon rice',
        price: 100,
        is_available: true,
        category: { code: 'meals' },
      },
      error: null,
    });
    const from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: dishMaybe }),
        }),
      }),
    });
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'quantity must be between 1 and 99' },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: SUPABASE_CLIENT, useValue: {} },
        { provide: SUPABASE_ADMIN_CLIENT, useValue: { from, rpc } },
      ],
    }).compile();

    const service = module.get(CartService);
    await expect(
      service.addItem('user-1', {
        kitchenId: 'kitchen-1',
        dishCode: 'lemon-rice',
        quantity: 50,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants';
import { DishesService } from './dishes.service';

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function createChain(result: QueryResult) {
  const chain: {
    select: jest.Mock;
    eq: jest.Mock;
    order: jest.Mock;
    maybeSingle: jest.Mock;
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    maybeSingle: jest.fn(),
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.maybeSingle.mockResolvedValue(result);

  return chain;
}

describe('DishesService', () => {
  async function createService(client: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DishesService,
        { provide: SUPABASE_CLIENT, useValue: client },
      ],
    }).compile();
    return module.get(DishesService);
  }

  it('throws 503 when Supabase is not configured', async () => {
    const service = await createService(null);
    await expect(
      service.listByKitchen('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('lists only available dishes for the kitchen, ordered by sort_order', async () => {
    const kitchenId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11';
    const kitchenChain = createChain({
      data: { id: kitchenId },
      error: null,
    });
    const dishesChain = createChain({
      data: [
        {
          id: '1',
          kitchen_id: kitchenId,
          code: 'lemon-rice',
          name: 'Lemon rice & potato fry',
          price: '100.00',
          description: 'Tangy lemon rice with crispy potatoes',
          spice_level: 'Mild',
          sort_order: 2,
          is_available: true,
          allergens: [{ label: 'Mustard' }, { label: 'Peanuts' }],
          category: { code: 'meals' },
        },
        {
          id: '2',
          kitchen_id: kitchenId,
          code: 'veg-lunch',
          name: 'Homestyle veg lunch',
          price: '140.00',
          description: 'Rice, sambar, poriyal & curd',
          spice_level: null,
          sort_order: 1,
          is_available: true,
          allergens: [],
          category: { code: 'meals' },
        },
      ],
      error: null,
    });

    const from = jest.fn((table: string) =>
      table === 'kitchens' ? kitchenChain : dishesChain,
    );
    const service = await createService({ from });

    const rows = await service.listByKitchen(kitchenId);
    expect(from).toHaveBeenCalledWith('kitchens');
    expect(from).toHaveBeenCalledWith('dishes');
    expect(dishesChain.eq).toHaveBeenCalledWith('kitchen_id', kitchenId);
    expect(dishesChain.eq).toHaveBeenCalledWith('is_available', true);
    expect(dishesChain.select).toHaveBeenCalledWith(
      expect.stringContaining('allergens:dish_allergens'),
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      code: 'lemon-rice',
      spiceLevel: 'Mild',
      allergens: ['Mustard', 'Peanuts'],
      categoryCode: 'meals',
      isAvailable: true,
      price: 100,
    });
    expect(rows[1]).toMatchObject({
      code: 'veg-lunch',
      spiceLevel: null,
      allergens: [],
    });
  });

  it('returns 404 for an unknown kitchen', async () => {
    const kitchenChain = createChain({ data: null, error: null });
    const from = jest.fn().mockReturnValue(kitchenChain);
    const service = await createService({ from });

    await expect(
      service.listByKitchen('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b99'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 for unknown or unavailable dish codes', async () => {
    const kitchenId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11';
    const kitchenChain = createChain({
      data: { id: kitchenId },
      error: null,
    });
    const dishesChain = createChain({ data: null, error: null });
    const from = jest.fn((table: string) =>
      table === 'kitchens' ? kitchenChain : dishesChain,
    );
    const service = await createService({ from });

    await expect(
      service.getByKitchenAndCode(kitchenId, 'no-such-dish'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects invalid dish codes', async () => {
    const kitchenId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11';
    const kitchenChain = createChain({
      data: { id: kitchenId },
      error: null,
    });
    const from = jest.fn().mockReturnValue(kitchenChain);
    const service = await createService({ from });

    await expect(
      service.getByKitchenAndCode(kitchenId, '   '),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getByKitchenAndCode(kitchenId, 'bad code!'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants';
import { escapeIlikePattern, LocationsService } from './locations.service';

type QueryResult = {
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
};

function createQueryBuilder(result: QueryResult) {
  const builder: {
    select: jest.Mock;
    eq: jest.Mock;
    ilike: jest.Mock;
    order: jest.Mock;
    limit: jest.Mock;
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise<unknown>;
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    ilike: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.ilike.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);

  return builder;
}

describe('LocationsService', () => {
  async function createService(client: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: SUPABASE_CLIENT,
          useValue: client,
        },
      ],
    }).compile();

    return {
      service: module.get(LocationsService),
    };
  }

  it('searches active from_locality rows by name', async () => {
    const rows = [
      {
        id: '1',
        name: 'Koramangala',
        city: 'Bengaluru',
        district: null,
        state: 'Karnataka',
        location_type: 'from_locality',
      },
    ];
    const builder = createQueryBuilder({ data: rows, error: null });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    const result = await service.search({
      type: 'from_locality',
      q: 'kora',
      limit: 10,
    });

    expect(from).toHaveBeenCalledWith('locations');
    expect(builder.select).toHaveBeenCalledWith(
      'id, name, city, district, state, location_type',
    );
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'location_type', 'from_locality');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_active', true);
    expect(builder.ilike).toHaveBeenCalledWith('name', '%kora%');
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(builder.limit).toHaveBeenCalledWith(10);
    expect(result).toEqual(rows);
  });

  it('escapes ILIKE wildcards in the passenger query', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    await service.search({ type: 'from_locality', q: '100%_off\\' });
    expect(builder.ilike).toHaveBeenCalledWith(
      'name',
      `%${escapeIlikePattern('100%_off\\')}%`,
    );
  });

  it('filters out rows whose location_type does not match the request', async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: '1',
          name: 'Koramangala',
          city: 'Bengaluru',
          district: null,
          state: 'Karnataka',
          location_type: 'from_locality',
        },
        {
          id: '2',
          name: 'Mysuru',
          city: 'Mysuru',
          district: null,
          state: 'Karnataka',
          location_type: 'to_destination',
        },
      ],
      error: null,
    });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    const result = await service.search({ type: 'from_locality', q: 'a' });
    expect(result).toHaveLength(1);
    expect(result[0]?.location_type).toBe('from_locality');
  });

  it('searches active to_destination rows by name', async () => {
    const rows = [
      {
        id: '2',
        name: 'Mysuru',
        city: 'Mysuru',
        district: null,
        state: 'Karnataka',
        location_type: 'to_destination',
      },
    ];
    const builder = createQueryBuilder({ data: rows, error: null });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    const result = await service.search({
      type: 'to_destination',
      q: 'mys',
      limit: 5,
    });

    expect(builder.eq).toHaveBeenNthCalledWith(1, 'location_type', 'to_destination');
    expect(builder.ilike).toHaveBeenCalledWith('name', '%mys%');
    expect(builder.limit).toHaveBeenCalledWith(5);
    expect(result).toEqual(rows);
  });

  it('defaults limit to 10 and caps at 20', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    await service.search({ type: 'from_locality', q: 'a' });
    expect(builder.limit).toHaveBeenCalledWith(10);

    await service.search({ type: 'from_locality', q: 'a', limit: 50 });
    expect(builder.limit).toHaveBeenCalledWith(20);
  });

  it('throws 503 when the Supabase client is missing', async () => {
    const { service } = await createService(null);

    await expect(
      service.search({ type: 'from_locality', q: 'kora' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws 503 when Supabase reports permission denied', async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: 'permission denied for table locations' },
    });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    await expect(
      service.search({ type: 'from_locality', q: 'kora' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws 500 when Supabase returns an unexpected error', async () => {
    const builder = createQueryBuilder({
      data: null,
      error: { message: 'connection reset' },
    });
    const from = jest.fn().mockReturnValue(builder);
    const { service } = await createService({ from });

    await expect(
      service.search({ type: 'from_locality', q: 'kora' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('escapeIlikePattern escapes %, _, and backslash', () => {
    expect(escapeIlikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });
});

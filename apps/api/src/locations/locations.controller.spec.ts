import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SearchLocationsQueryDto } from './dto/search-locations.dto';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

describe('LocationsController', () => {
  const search = jest.fn();
  let controller: LocationsController;
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    search.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: { search },
        },
      ],
    }).compile();

    controller = module.get(LocationsController);
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  });

  async function parseQuery(query: Record<string, unknown>) {
    return validationPipe.transform(query, {
      type: 'query',
      metatype: SearchLocationsQueryDto,
      data: '',
    });
  }

  it('returns from_locality search results from the service', async () => {
    const rows = [
      {
        id: '1',
        name: 'Koramangala',
        city: 'Bengaluru',
        district: null,
        state: 'Karnataka',
        location_type: 'from_locality' as const,
      },
    ];
    search.mockResolvedValue(rows);

    const query = (await parseQuery({
      type: 'from_locality',
      q: 'kora',
      limit: '10',
    })) as SearchLocationsQueryDto;

    await expect(controller.search(query)).resolves.toEqual(rows);
    expect(search).toHaveBeenCalledWith({
      type: 'from_locality',
      q: 'kora',
      limit: 10,
    });
  });

  it('returns to_destination search results from the service', async () => {
    const rows = [
      {
        id: '2',
        name: 'Mysuru',
        city: 'Mysuru',
        district: null,
        state: 'Karnataka',
        location_type: 'to_destination' as const,
      },
    ];
    search.mockResolvedValue(rows);

    const query = (await parseQuery({
      type: 'to_destination',
      q: 'mys',
    })) as SearchLocationsQueryDto;

    await expect(controller.search(query)).resolves.toEqual(rows);
    expect(search).toHaveBeenCalledWith({
      type: 'to_destination',
      q: 'mys',
      limit: undefined,
    });
  });

  it('rejects an invalid location type', async () => {
    await expect(parseQuery({ type: 'boarding_point', q: 'kora' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a missing search type', async () => {
    await expect(parseQuery({ q: 'kora' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a limit above the maximum', async () => {
    await expect(
      parseQuery({ type: 'from_locality', q: 'kora', limit: '21' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-positive limit', async () => {
    await expect(
      parseQuery({ type: 'from_locality', q: 'kora', limit: '0' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an overly long q', async () => {
    await expect(
      parseQuery({ type: 'from_locality', q: 'x'.repeat(121) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('trims q before validation', async () => {
    const query = (await parseQuery({
      type: 'to_destination',
      q: '  Mysuru  ',
    })) as SearchLocationsQueryDto;

    expect(query.q).toBe('Mysuru');
  });
});

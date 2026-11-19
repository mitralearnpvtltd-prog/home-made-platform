import { Test, TestingModule } from '@nestjs/testing';
import { KitchensController } from './kitchens.controller';
import { KitchensService } from './kitchens.service';

describe('KitchensController', () => {
  const list = jest.fn();
  let controller: KitchensController;

  beforeEach(async () => {
    list.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchensController],
      providers: [
        {
          provide: KitchensService,
          useValue: { list },
        },
      ],
    }).compile();

    controller = module.get(KitchensController);
  });

  it('returns kitchen list results from the service', async () => {
    const rows = [
      {
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
        cookId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Swathi’s Kitchen',
        blurb: 'Everyday South Indian comfort food',
        offerLabel: 'Meals & homemade snacks',
        offerType: 'meals-snacks' as const,
        fromPrice: 60,
        photoUrl:
          'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Swathi/Swathi.jpeg',
        hasMenu: true,
        isVerified: true,
        isVegetarian: true,
        rating: 4.8,
        reviewCount: 126,
      },
    ];
    list.mockResolvedValue(rows);

    await expect(controller.list()).resolves.toEqual(rows);
    expect(list).toHaveBeenCalledTimes(1);
  });
});

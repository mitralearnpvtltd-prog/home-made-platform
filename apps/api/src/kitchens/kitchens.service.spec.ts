import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.constants';
import { KitchensService } from './kitchens.service';

describe('KitchensService', () => {
  it('throws when Supabase is not configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchensService,
        { provide: SUPABASE_CLIENT, useValue: null },
      ],
    }).compile();

    const service = module.get(KitchensService);
    await expect(service.list()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('maps kitchen join rows into list items', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
          name: 'Swathi’s Kitchen',
          cook: {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            blurb: 'Everyday South Indian comfort food',
            offer_label: 'Meals & homemade snacks',
            offer_type: 'meals-snacks',
            from_price: '60.00',
            photo_url:
              'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Swathi/Swathi.jpeg',
            has_menu: true,
            is_verified: true,
            is_vegetarian: true,
            rating: '4.8',
            review_count: 126,
          },
        },
      ],
      error: null,
    });
    const select = jest.fn().mockReturnValue({ order });
    const from = jest.fn().mockReturnValue({ select });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KitchensService,
        { provide: SUPABASE_CLIENT, useValue: { from } },
      ],
    }).compile();

    const service = module.get(KitchensService);
    await expect(service.list()).resolves.toEqual([
      {
        id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11',
        cookId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Swathi’s Kitchen',
        blurb: 'Everyday South Indian comfort food',
        offerLabel: 'Meals & homemade snacks',
        offerType: 'meals-snacks',
        fromPrice: 60,
        photoUrl:
          'https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Swathi/Swathi.jpeg',
        hasMenu: true,
        isVerified: true,
        isVegetarian: true,
        rating: 4.8,
        reviewCount: 126,
      },
    ]);
    expect(from).toHaveBeenCalledWith('kitchens');
  });
});

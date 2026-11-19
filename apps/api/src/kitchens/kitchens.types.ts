export type KitchenListItem = {
  id: string;
  cookId: string;
  name: string;
  blurb: string | null;
  offerLabel: string | null;
  offerType: 'meals-snacks' | 'snacks' | null;
  fromPrice: number | null;
  photoUrl: string | null;
  hasMenu: boolean;
  isVerified: boolean;
  /** null = unknown; do not treat as non-vegetarian */
  isVegetarian: boolean | null;
  rating: number | null;
  reviewCount: number;
};

type CookJoinRow = {
  id: string;
  blurb: string | null;
  offer_label: string | null;
  offer_type: 'meals-snacks' | 'snacks' | null;
  from_price: number | string | null;
  photo_url: string | null;
  has_menu: boolean;
  is_verified: boolean;
  is_vegetarian: boolean | null;
  rating: number | string | null;
  review_count: number;
};

export type KitchenQueryRow = {
  id: string;
  name: string;
  cook: CookJoinRow | CookJoinRow[] | null;
};

export type DishSpiceLevel = 'Mild' | 'Medium' | 'Hot';

export type DishListItem = {
  id: string;
  kitchenId: string;
  code: string;
  name: string;
  price: number;
  description: string | null;
  /** Kitchen-supplied spice; null when the kitchen has not specified one. */
  spiceLevel: DishSpiceLevel | null;
  categoryCode: string | null;
  sortOrder: number;
  isAvailable: boolean;
};

export type DishQueryRow = {
  id: string;
  kitchen_id: string;
  code: string;
  name: string;
  price: number | string;
  description: string | null;
  spice_level: string | null;
  sort_order: number;
  is_available: boolean;
  category: { code: string } | { code: string }[] | null;
};

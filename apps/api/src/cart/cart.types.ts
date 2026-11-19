export type CartItemDto = {
  id: string;
  dishId: string;
  dishCode: string;
  kitchenId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  categoryCode: string | null;
  isAvailable: boolean;
};

export type CartDto = {
  id: string;
  kitchenId: string | null;
  status: 'active';
  items: CartItemDto[];
  itemCount: number;
  subtotal: number;
};

export type CartRow = {
  id: string;
  user_id: string;
  kitchen_id: string | null;
  status: string;
};

export type CartItemRow = {
  id: string;
  cart_id: string;
  dish_id: string;
  quantity: number;
};

export type DishCartRow = {
  id: string;
  kitchen_id: string;
  code: string;
  name: string;
  price: number | string;
  is_available: boolean;
  category: { code: string } | { code: string }[] | null;
};

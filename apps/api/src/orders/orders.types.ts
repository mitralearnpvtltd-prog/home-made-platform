export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type OrderItemDto = {
  id: string;
  dishId: string | null;
  dishCode: string;
  dishName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderDto = {
  id: string;
  orderNumber: string;
  kitchenId: string;
  kitchenName: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  collectorName: string;
  collectorPhone: string;
  collectionPoint: string | null;
  kitchenNote: string | null;
  pickupNote: string | null;
  pickupStopName: string;
  pickupTime: string | null;
  journeyFrom: string | null;
  journeyTo: string | null;
  journeyDate: string | null;
  busNumber: string | null;
  seatNumber: string | null;
  subtotal: number;
  pickupServiceFee: number;
  taxAmount: number;
  total: number;
  currency: string;
  items: OrderItemDto[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderListItemDto = {
  id: string;
  orderNumber: string;
  kitchenId: string;
  kitchenName: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  itemCount: number;
  primaryItemName: string | null;
  items: OrderItemDto[];
  journeyDate: string | null;
  pickupTime: string | null;
  createdAt: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  kitchen_id: string;
  source_cart_id: string | null;
  status: string;
  payment_status: string;
  collector_name: string;
  collector_phone: string;
  collection_point: string | null;
  kitchen_note: string | null;
  pickup_note: string | null;
  pickup_stop_name: string;
  pickup_time: string | null;
  journey_from: string | null;
  journey_to: string | null;
  journey_date: string | null;
  bus_number: string | null;
  seat_number: string | null;
  subtotal: number | string;
  pickup_service_fee: number | string;
  tax_amount: number | string;
  total: number | string;
  currency: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
  kitchens?: { name: string } | { name: string }[] | null;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_code: string;
  dish_name: string;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
};

import type { PaymentStatus } from '../orders/orders.types';

export type CashfreeEnvironmentName = 'SANDBOX' | 'PRODUCTION';

export type PaymentSessionResponse = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentSessionId: string;
  cashfreeOrderId: string;
  environment: 'sandbox' | 'production';
  paymentStatus: PaymentStatus;
};

export type PaymentVerifyResponse = {
  orderId: string;
  paymentStatus: PaymentStatus;
  cashfreeOrderId: string | null;
  cashfreeOrderStatus: string | null;
  alreadyPaid: boolean;
  verified: boolean;
};

export type PaymentStatusResponse = {
  orderId: string;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  cashfreeOrderId: string | null;
  verifiedAt: string | null;
};

export type OrderPaymentRow = {
  id: string;
  user_id: string;
  order_number: string;
  kitchen_id: string;
  payment_status: string;
  collector_name: string;
  collector_phone: string;
  total: number | string;
  currency: string;
  cashfree_order_id: string | null;
  cashfree_cf_order_id: string | null;
  cashfree_payment_session_id: string | null;
  cashfree_payment_id: string | null;
  payment_session_created_at: string | null;
  payment_verified_at: string | null;
};

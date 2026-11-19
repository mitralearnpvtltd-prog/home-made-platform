/**
 * Kitchen checkout fee scheme — mirrors apps/web/src/lib/checkoutFees.ts.
 * Authoritative totals are computed in order_create_from_cart (Supabase RPC):
 *   pickup_service_fee = ₹0 (delivery charged)
 *   tax_amount         = GST 18% of items subtotal
 *   total              = subtotal + GST
 */

export const CHECKOUT_GST_RATE = 0.18;
export const CHECKOUT_DELIVERY_FEE_LIST = 35;
export const CHECKOUT_DELIVERY_FEE_CHARGED = 0;

/** Persisted on orders.pickup_service_fee (charged delivery / pickup). */
export const CHECKOUT_PICKUP_SERVICE_FEE = CHECKOUT_DELIVERY_FEE_CHARGED;

export function roundCheckoutMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function checkoutGstFromSubtotal(subtotal: number): number {
  return roundCheckoutMoney(subtotal * CHECKOUT_GST_RATE);
}

export function checkoutTotalFromSubtotal(subtotal: number): number {
  const safeSubtotal = roundCheckoutMoney(subtotal);
  return roundCheckoutMoney(safeSubtotal + checkoutGstFromSubtotal(safeSubtotal));
}

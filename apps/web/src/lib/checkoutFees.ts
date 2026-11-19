/**
 * Kitchen checkout / order totals.
 * Matches API order_create_from_cart (after migration 20261123000000_order_gst_pricing).
 *
 * Formula:
 *   GST = round(items subtotal × 18%, 2)
 *   Delivery fee charged = ₹0 (list price ₹35 shown as FREE in UI)
 *   Total = items subtotal + GST
 */
export const CHECKOUT_GST_RATE = 0.18;
/** Marketing list price shown with strikethrough; not added to payable total. */
export const CHECKOUT_DELIVERY_FEE_LIST = 35;
/** Amount charged and persisted as orders.pickup_service_fee. */
export const CHECKOUT_DELIVERY_FEE_CHARGED = 0;

/** @deprecated Use CHECKOUT_DELIVERY_FEE_CHARGED — column still named pickup_service_fee. */
export const CHECKOUT_PICKUP_SERVICE_FEE = CHECKOUT_DELIVERY_FEE_CHARGED;

export function roundCheckoutMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function checkoutGstFromSubtotal(subtotal: number): number {
  return roundCheckoutMoney(subtotal * CHECKOUT_GST_RATE);
}

/**
 * Display-only currency helper: always exactly two decimal places (e.g. ₹256.60).
 * Does not change stored amounts or calculation rules.
 */
export function formatCheckoutMoney(value: number): string {
  const amount = typeof value === "number" ? value : Number(value);
  return `₹${(Number.isFinite(amount) ? amount : 0).toFixed(2)}`;
}

/** @deprecated Prefer formatCheckoutMoney — kept for existing GST call sites. */
export function formatGstAmount(value: number): string {
  return formatCheckoutMoney(value);
}

/** Total from the same rounded GST amount shown to the customer. */
export function checkoutTotalFromSubtotal(subtotal: number): number {
  const safeSubtotal = roundCheckoutMoney(subtotal);
  const gst = checkoutGstFromSubtotal(safeSubtotal);
  return roundCheckoutMoney(safeSubtotal + gst);
}

/** @deprecated Prefer checkoutGstFromSubtotal(subtotal) — GST is percentage-based. */
export const CHECKOUT_TAX_AMOUNT = 0;

/** @deprecated Prefer checkoutTotalFromSubtotal(subtotal). */
export const CHECKOUT_FEES_TOTAL = 0;

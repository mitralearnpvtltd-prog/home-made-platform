import {
  checkoutGstFromSubtotal,
  checkoutTotalFromSubtotal,
  CHECKOUT_DELIVERY_FEE_CHARGED,
} from './checkout-fees';

describe('checkout-fees', () => {
  it('charges no delivery fee', () => {
    expect(CHECKOUT_DELIVERY_FEE_CHARGED).toBe(0);
  });

  it('computes GST 18% and total for ₹320', () => {
    expect(checkoutGstFromSubtotal(320)).toBe(57.6);
    expect(checkoutTotalFromSubtotal(320)).toBe(377.6);
  });

  it('computes GST 18% and total for ₹100', () => {
    expect(checkoutGstFromSubtotal(100)).toBe(18);
    expect(checkoutTotalFromSubtotal(100)).toBe(118);
  });

  it('computes GST 18% and total for ₹80', () => {
    expect(checkoutGstFromSubtotal(80)).toBe(14.4);
    expect(checkoutTotalFromSubtotal(80)).toBe(94.4);
  });

  it('matches checkout and saved-order totals for ₹160 (GST 18%, delivery ₹0)', () => {
    const subtotal = 160;
    const gst = checkoutGstFromSubtotal(subtotal);
    const total = checkoutTotalFromSubtotal(subtotal);
    // Mirrors order_create_from_cart after GST + bus/seat migrations:
    // v_tax := round(v_subtotal * 0.18, 2); v_pickup_fee := 0; total = subtotal + tax
    expect(CHECKOUT_DELIVERY_FEE_CHARGED).toBe(0);
    expect(gst).toBe(28.8);
    expect(total).toBe(188.8);
    expect(total).toBe(subtotal + gst + CHECKOUT_DELIVERY_FEE_CHARGED);
  });
});

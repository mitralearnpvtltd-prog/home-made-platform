import {
  checkoutGstFromSubtotal,
  checkoutTotalFromSubtotal,
  formatCheckoutMoney,
  CHECKOUT_DELIVERY_FEE_CHARGED,
} from "./checkoutFees";

describe("checkoutFees", () => {
  it("charges no delivery fee", () => {
    expect(CHECKOUT_DELIVERY_FEE_CHARGED).toBe(0);
  });

  it("computes GST 18% and total for ₹320", () => {
    expect(checkoutGstFromSubtotal(320)).toBe(57.6);
    expect(checkoutTotalFromSubtotal(320)).toBe(377.6);
  });

  it("computes GST 18% and total for ₹100", () => {
    expect(checkoutGstFromSubtotal(100)).toBe(18);
    expect(checkoutTotalFromSubtotal(100)).toBe(118);
  });

  it("computes GST 18% and total for ₹80", () => {
    expect(checkoutGstFromSubtotal(80)).toBe(14.4);
    expect(checkoutTotalFromSubtotal(80)).toBe(94.4);
  });

  it("keeps trailing zeros when formatting checkout money", () => {
    expect(formatCheckoutMoney(256.6)).toBe("₹256.60");
    expect(formatCheckoutMoney(259.65)).toBe("₹259.65");
    expect(formatCheckoutMoney(100)).toBe("₹100.00");
    expect(formatCheckoutMoney(188.8)).toBe("₹188.80");
  });

  it("builds total from the same rounded GST that is displayed", () => {
    const subtotal = 160;
    const gst = checkoutGstFromSubtotal(subtotal);
    expect(formatCheckoutMoney(gst)).toBe("₹28.80");
    expect(checkoutTotalFromSubtotal(subtotal)).toBe(188.8);
    expect(formatCheckoutMoney(checkoutTotalFromSubtotal(subtotal))).toBe("₹188.80");
  });

  it("matches saved-order formula: subtotal + GST + ₹0 delivery", () => {
    const cases = [
      { subtotal: 160, gst: 28.8, total: 188.8 },
      { subtotal: 100, gst: 18, total: 118 },
      { subtotal: 80, gst: 14.4, total: 94.4 },
    ] as const;
    for (const row of cases) {
      const gst = checkoutGstFromSubtotal(row.subtotal);
      const total = checkoutTotalFromSubtotal(row.subtotal);
      expect(CHECKOUT_DELIVERY_FEE_CHARGED).toBe(0);
      expect(gst).toBe(row.gst);
      expect(total).toBe(row.total);
      expect(total).toBe(row.subtotal + gst + CHECKOUT_DELIVERY_FEE_CHARGED);
      expect(formatCheckoutMoney(gst)).toBe(`₹${row.gst.toFixed(2)}`);
      expect(formatCheckoutMoney(total)).toBe(`₹${row.total.toFixed(2)}`);
    }
  });
});

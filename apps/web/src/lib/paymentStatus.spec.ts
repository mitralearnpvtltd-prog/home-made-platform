import {
  canRetryPayment,
  isPaymentPaid,
  paymentStatusLabel,
  paymentStatusSummary,
} from "./paymentStatus";

describe("paymentStatus helpers", () => {
  it("only treats paid as paid", () => {
    expect(isPaymentPaid("paid")).toBe(true);
    expect(isPaymentPaid("failed")).toBe(false);
    expect(isPaymentPaid("refunded")).toBe(false);
    expect(isPaymentPaid("pending")).toBe(false);
  });

  it("allows retry only for pending and failed", () => {
    expect(canRetryPayment("pending")).toBe(true);
    expect(canRetryPayment("failed")).toBe(true);
    expect(canRetryPayment("paid")).toBe(false);
    expect(canRetryPayment("refunded")).toBe(false);
  });

  it("never labels failed or refunded as Paid", () => {
    expect(paymentStatusLabel("failed")).toBe("Failed");
    expect(paymentStatusLabel("refunded")).toBe("Refunded");
    expect(paymentStatusSummary("failed")).not.toMatch(/confirmed/i);
    expect(paymentStatusSummary("refunded")).not.toMatch(/confirmed/i);
  });
});

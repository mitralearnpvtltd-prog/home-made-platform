import type { PaymentStatus } from "./api";

export function normalizePaymentStatus(
  status: string | null | undefined,
): PaymentStatus {
  const value = (status ?? "pending").toLowerCase();
  if (value === "paid" || value === "failed" || value === "refunded") {
    return value;
  }
  return "pending";
}

export function isPaymentPaid(status: string | null | undefined): boolean {
  return normalizePaymentStatus(status) === "paid";
}

export function canRetryPayment(status: string | null | undefined): boolean {
  const value = normalizePaymentStatus(status);
  return value === "pending" || value === "failed";
}

export function paymentStatusLabel(status: string | null | undefined): string {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return "Paid";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default:
      return "Pending";
  }
}

export function paymentStatusSummary(status: string | null | undefined): string {
  switch (normalizePaymentStatus(status)) {
    case "paid":
      return "Your order has been confirmed.";
    case "failed":
      return "Payment failed or was cancelled. You can retry payment.";
    case "refunded":
      return "This payment was refunded.";
    default:
      return "Order placed. Payment is still pending.";
  }
}

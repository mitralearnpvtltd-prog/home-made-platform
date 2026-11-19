export type CashfreePaymentOutcome =
  | "redirect"
  | "paid"
  | "pending"
  | "failed"
  | "cancelled"
  | "expired"
  | "unknown";

/** Maps Cashfree pay()/checkout() payloads to Aahaa payment outcomes. */
export function mapCashfreePayResult(result: unknown): CashfreePaymentOutcome {
  if (!result || typeof result !== "object") {
    return "pending";
  }

  const payload = result as {
    error?: { message?: string; code?: string } | unknown;
    paymentDetails?: { paymentStatus?: string; paymentMessage?: string };
  };

  if (payload.error) {
    const message = String(
      (payload.error as { message?: string })?.message ?? payload.error ?? "",
    ).toLowerCase();
    if (message.includes("expir")) return "expired";
    if (message.includes("cancel") || message.includes("user_dropped")) return "cancelled";
    return "failed";
  }

  const paymentStatus = String(payload.paymentDetails?.paymentStatus ?? "").toUpperCase();
  if (paymentStatus === "SUCCESS" || paymentStatus === "PAID") return "paid";
  if (paymentStatus === "PENDING") return "pending";
  if (paymentStatus === "FAILED") return "failed";
  if (paymentStatus === "CANCELLED" || paymentStatus === "CANCELED") return "cancelled";
  if (paymentStatus === "USER_DROPPED") return "cancelled";
  if (paymentStatus === "EXPIRED") return "expired";

  const message = String(payload.paymentDetails?.paymentMessage ?? "").toLowerCase();
  if (message.includes("finished") || message.includes("check status")) return "pending";
  return "unknown";
}

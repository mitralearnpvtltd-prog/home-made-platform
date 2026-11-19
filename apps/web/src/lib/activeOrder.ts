const ACTIVE_ORDER_KEY = "aahaa.activeOrderId";
const IDEMPOTENCY_KEY = "aahaa.checkout.idempotencyKey";

export function readActiveOrderId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_ORDER_KEY);
  } catch {
    return null;
  }
}

export function writeActiveOrderId(orderId: string): void {
  try {
    sessionStorage.setItem(ACTIVE_ORDER_KEY, orderId);
  } catch {
    /* ignore quota */
  }
}

export function clearActiveOrderId(): void {
  try {
    sessionStorage.removeItem(ACTIVE_ORDER_KEY);
  } catch {
    /* ignore */
  }
}

/** Stable per checkout attempt so Pay retries do not create duplicate orders. */
export function getCheckoutIdempotencyKey(): string {
  try {
    const existing = sessionStorage.getItem(IDEMPOTENCY_KEY);
    if (existing && existing.length >= 8) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(IDEMPOTENCY_KEY, next);
    return next;
  } catch {
    return `checkout-${Date.now()}`;
  }
}

export function clearCheckoutIdempotencyKey(): void {
  try {
    sessionStorage.removeItem(IDEMPOTENCY_KEY);
  } catch {
    /* ignore */
  }
}

export function orderIdFromLocationSearch(search = window.location.search): string | null {
  const value = new URLSearchParams(search).get("orderId");
  return value && value.trim() ? value.trim() : null;
}

export function withOrderId(path: string, orderId: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("orderId", orderId);
  return `${url.pathname}${url.search}`;
}

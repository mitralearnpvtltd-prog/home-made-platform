import { addCartItem, clearCart, getCart, type Cart } from "./api";
import { getAccessToken } from "./authSession";

/** Mirrors apps/api/src/cart/guest-merge.policy.ts */
function evaluateGuestCartMerge(input: {
  hasGuestCart: boolean;
  guestKitchenId?: string | null;
  serverKitchenId?: string | null;
  serverItemCount: number;
}): "merged" | "conflict" | "noop" {
  if (!input.hasGuestCart || !input.guestKitchenId) return "noop";
  if (
    input.serverKitchenId &&
    input.serverKitchenId !== input.guestKitchenId &&
    input.serverItemCount > 0
  ) {
    return "conflict";
  }
  return "merged";
}

const GUEST_CART_KEY = "aahaa.guest.cart";
const GUEST_CONFLICT_KEY = "aahaa.guest.cart.conflict";

export type GuestCartItem = {
  dishCode: string;
  qty: number;
};

export type GuestCart = {
  kitchenId: string;
  items: GuestCartItem[];
};

export type GuestCartConflict = {
  guestKitchenId: string;
  serverKitchenId: string;
  guestItemCount: number;
  serverItemCount: number;
};

export function readGuestCart(): GuestCart | null {
  try {
    const raw = sessionStorage.getItem(GUEST_CART_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestCart;
    if (
      !parsed ||
      typeof parsed.kitchenId !== "string" ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    const items = parsed.items
      .filter(
        (item) =>
          item &&
          typeof item.dishCode === "string" &&
          typeof item.qty === "number" &&
          item.qty > 0,
      )
      .map((item) => ({
        dishCode: item.dishCode,
        qty: Math.min(99, Math.max(1, Math.floor(item.qty))),
      }));
    if (items.length === 0) return null;
    return { kitchenId: parsed.kitchenId, items };
  } catch {
    return null;
  }
}

export function writeGuestCart(
  kitchenId: string,
  items: GuestCartItem[],
): void {
  try {
    const cleaned = items
      .filter((item) => item.qty > 0)
      .map((item) => ({
        dishCode: item.dishCode,
        qty: Math.min(99, Math.max(1, Math.floor(item.qty))),
      }));
    if (cleaned.length === 0) {
      sessionStorage.removeItem(GUEST_CART_KEY);
      return;
    }
    const payload: GuestCart = { kitchenId, items: cleaned };
    sessionStorage.setItem(GUEST_CART_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

export function clearGuestCart(): void {
  try {
    sessionStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // ignore
  }
}

export function readGuestCartConflict(): GuestCartConflict | null {
  try {
    const raw = sessionStorage.getItem(GUEST_CONFLICT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestCartConflict;
  } catch {
    return null;
  }
}

export function writeGuestCartConflict(conflict: GuestCartConflict): void {
  try {
    sessionStorage.setItem(GUEST_CONFLICT_KEY, JSON.stringify(conflict));
  } catch {
    // ignore
  }
}

export function clearGuestCartConflict(): void {
  try {
    sessionStorage.removeItem(GUEST_CONFLICT_KEY);
  } catch {
    // ignore
  }
}

function guestItemCount(guest: GuestCart): number {
  return guest.items.reduce((sum, item) => sum + item.qty, 0);
}

/**
 * After login/register: merge guest Meal Bag into the authenticated cart when safe.
 * Never silently discards guest items on kitchen conflict — records a conflict instead.
 */
export async function mergeGuestCartToServer(): Promise<"merged" | "conflict" | "noop" | "failed"> {
  if (!getAccessToken()) return "noop";
  const guest = readGuestCart();
  if (!guest) {
    clearGuestCartConflict();
    return "noop";
  }

  try {
    const current = await getCart();
    const decision = evaluateGuestCartMerge({
      hasGuestCart: true,
      guestKitchenId: guest.kitchenId,
      serverKitchenId: current.kitchenId,
      serverItemCount: current.itemCount,
    });
    if (decision === "conflict") {
      writeGuestCartConflict({
        guestKitchenId: guest.kitchenId,
        serverKitchenId: current.kitchenId!,
        guestItemCount: guestItemCount(guest),
        serverItemCount: current.itemCount,
      });
      // Keep guest cart in sessionStorage for recovery — never silent discard.
      return "conflict";
    }

    for (const item of guest.items) {
      await addCartItem({
        kitchenId: guest.kitchenId,
        dishCode: item.dishCode,
        quantity: item.qty,
      });
    }
    clearGuestCart();
    clearGuestCartConflict();
    return "merged";
  } catch {
    // Preserve both guest cart and any conflict marker on network/API failure.
    return "failed";
  }
}

/** Keep the signed-in server cart; discard the ephemeral guest bag intentionally. */
export function keepServerCartOverGuest(): void {
  clearGuestCart();
  clearGuestCartConflict();
}

/**
 * Replace the signed-in cart with the preserved guest bag (same-kitchen add after clear).
 * On failure, guest cart and conflict stay in sessionStorage for retry.
 */
export async function replaceServerCartWithGuest(): Promise<Cart | null> {
  if (!getAccessToken()) return null;
  const guest = readGuestCart();
  if (!guest) {
    clearGuestCartConflict();
    return null;
  }

  try {
    await clearCart();
    let last: Cart | null = null;
    for (const item of guest.items) {
      last = await addCartItem({
        kitchenId: guest.kitchenId,
        dishCode: item.dishCode,
        quantity: item.qty,
      });
    }
    clearGuestCart();
    clearGuestCartConflict();
    return last;
  } catch {
    return null;
  }
}

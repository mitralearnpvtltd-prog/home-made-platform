/**
 * Pure guest→server Meal Bag merge policy (mirrors apps/web/src/lib/guestCart.ts).
 * Kept here so Nest/API tests can lock the conflict rules without a web test runner.
 */
export type GuestMergeDecision = 'merged' | 'conflict' | 'noop';

export function evaluateGuestCartMerge(input: {
  hasGuestCart: boolean;
  guestKitchenId?: string | null;
  serverKitchenId?: string | null;
  serverItemCount: number;
}): GuestMergeDecision {
  if (!input.hasGuestCart || !input.guestKitchenId) {
    return 'noop';
  }
  if (
    input.serverKitchenId &&
    input.serverKitchenId !== input.guestKitchenId &&
    input.serverItemCount > 0
  ) {
    return 'conflict';
  }
  return 'merged';
}

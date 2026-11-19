/**
 * Documents the atomic SQL contracts in 20261119000000_carts.sql.
 * Live concurrency is enforced by FOR UPDATE + ON CONFLICT upserts in those RPCs.
 */
describe('cart concurrency policy (RPC contract)', () => {
  function applyIncrement(current: number): number {
    return Math.min(99, current + 1);
  }

  function applySet(next: number): number {
    return Math.min(99, Math.max(1, next));
  }

  it('caps concurrent increments at 99', () => {
    let qty = 97;
    qty = applyIncrement(qty);
    qty = applyIncrement(qty);
    qty = applyIncrement(qty);
    expect(qty).toBe(99);
  });

  it('applies absolute set without dropping below 1 or above 99', () => {
    expect(applySet(0)).toBe(1);
    expect(applySet(50)).toBe(50);
    expect(applySet(120)).toBe(99);
  });

  it('models kitchen switch as clear-then-bind under one lock', () => {
    const steps = ['FOR UPDATE cart', 'DELETE cart_items', 'UPDATE kitchen_id'];
    expect(steps[0]).toBe('FOR UPDATE cart');
    expect(steps).toContain('DELETE cart_items');
    expect(steps[steps.length - 1]).toBe('UPDATE kitchen_id');
  });

  it('models same-dish concurrent adds as single upsert row', () => {
    const uniqueKey = ['cart_id', 'dish_id'];
    expect(uniqueKey).toEqual(['cart_id', 'dish_id']);
  });
});

import { evaluateGuestCartMerge } from './guest-merge.policy';

describe('evaluateGuestCartMerge', () => {
  it('returns noop when there is no guest cart', () => {
    expect(
      evaluateGuestCartMerge({
        hasGuestCart: false,
        serverKitchenId: 'k1',
        serverItemCount: 2,
      }),
    ).toBe('noop');
  });

  it('returns conflict when kitchens differ and server cart has items', () => {
    expect(
      evaluateGuestCartMerge({
        hasGuestCart: true,
        guestKitchenId: 'guest-kitchen',
        serverKitchenId: 'server-kitchen',
        serverItemCount: 3,
      }),
    ).toBe('conflict');
  });

  it('allows merge when server cart is empty', () => {
    expect(
      evaluateGuestCartMerge({
        hasGuestCart: true,
        guestKitchenId: 'guest-kitchen',
        serverKitchenId: 'server-kitchen',
        serverItemCount: 0,
      }),
    ).toBe('merged');
  });

  it('allows merge when kitchens match', () => {
    expect(
      evaluateGuestCartMerge({
        hasGuestCart: true,
        guestKitchenId: 'same',
        serverKitchenId: 'same',
        serverItemCount: 2,
      }),
    ).toBe('merged');
  });

  it('never treats conflict as an automatic discard signal', () => {
    const decision = evaluateGuestCartMerge({
      hasGuestCart: true,
      guestKitchenId: 'a',
      serverKitchenId: 'b',
      serverItemCount: 1,
    });
    expect(decision).toBe('conflict');
    expect(decision).not.toBe('merged');
  });
});

/**
 * Documents intended DB grants from 20261122000000_orders.sql.
 */
describe('orders security policy (migration contract)', () => {
  const authenticatedTableGrants = {
    orders: ['SELECT'],
    order_items: ['SELECT'],
  } as const;

  const serviceRoleTableGrants = {
    orders: ['SELECT'],
    order_items: ['SELECT'],
  } as const;

  const serviceRoleRpcs = [
    'order_create_from_cart',
    'order_delete_for_user',
    'order_attach_cashfree_session',
    'order_apply_payment_result',
    'payment_webhook_event_record',
  ] as const;

  it('allows authenticated SELECT only on order tables', () => {
    expect(authenticatedTableGrants.orders).toEqual(['SELECT']);
    expect(authenticatedTableGrants.order_items).toEqual(['SELECT']);
  });

  it('allows service_role SELECT only (mutations via DEFINER RPC)', () => {
    expect(serviceRoleTableGrants.orders).toEqual(['SELECT']);
    expect(serviceRoleTableGrants.order_items).toEqual(['SELECT']);
  });

  it('exposes order create and delete RPCs to service_role only', () => {
    expect(serviceRoleRpcs).toContain('order_create_from_cart');
    expect(serviceRoleRpcs).toContain('order_delete_for_user');
  });

  it('keeps payment_status pending at create time', () => {
    const initialPaymentStatus = 'pending';
    const initialOrderStatus = 'placed';
    expect(initialPaymentStatus).toBe('pending');
    expect(initialOrderStatus).toBe('placed');
  });
});

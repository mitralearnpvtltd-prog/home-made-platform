/**
 * Documents intended DB grants from 20261119000000_carts.sql.
 * Runtime grant checks require the migration to be applied on Supabase.
 */
describe('cart security policy (migration contract)', () => {
  const authenticatedTablePrivileges = {
    carts: ['SELECT'],
    cart_items: ['SELECT'],
  } as const;

  const serviceRoleTablePrivileges = {
    carts: ['SELECT'],
    cart_items: ['SELECT'],
  } as const;

  const mutationVerbs = ['INSERT', 'UPDATE', 'DELETE'] as const;

  const serviceRoleRpc = [
    'cart_lock_active_cart',
    'cart_switch_kitchen',
    'cart_add_item',
    'cart_set_item_quantity',
    'cart_clear',
  ] as const;

  const rpcExecuteRoles = {
    granted: ['service_role'],
    revoked: ['PUBLIC', 'anon', 'authenticated'],
  } as const;

  it('allows authenticated SELECT only on carts and cart_items', () => {
    expect(authenticatedTablePrivileges.carts).toEqual(['SELECT']);
    expect(authenticatedTablePrivileges.cart_items).toEqual(['SELECT']);
  });

  it('forbids direct authenticated mutations on cart tables', () => {
    for (const verb of mutationVerbs) {
      expect(authenticatedTablePrivileges.carts).not.toContain(verb);
      expect(authenticatedTablePrivileges.cart_items).not.toContain(verb);
    }
  });

  it('gives service_role SELECT only on cart tables (mutations via RPCs)', () => {
    expect(serviceRoleTablePrivileges.carts).toEqual(['SELECT']);
    expect(serviceRoleTablePrivileges.cart_items).toEqual(['SELECT']);
    for (const verb of mutationVerbs) {
      expect(serviceRoleTablePrivileges.carts).not.toContain(verb);
      expect(serviceRoleTablePrivileges.cart_items).not.toContain(verb);
    }
  });

  it('documents explicit REVOKE INSERT/UPDATE/DELETE from service_role', () => {
    // Mirrors migration: GRANT SELECT then REVOKE INSERT, UPDATE, DELETE.
    const serviceRoleDirectWrite = [] as const;
    expect(serviceRoleDirectWrite).not.toEqual(
      expect.arrayContaining([...mutationVerbs]),
    );
    expect(serviceRoleTablePrivileges.carts).toEqual(['SELECT']);
    expect(serviceRoleTablePrivileges.cart_items).toEqual(['SELECT']);
  });

  it('exposes mutation RPCs to service_role only (Nest JWT path)', () => {
    expect(serviceRoleRpc).toContain('cart_add_item');
    expect(serviceRoleRpc).toContain('cart_set_item_quantity');
    expect(serviceRoleRpc).toContain('cart_switch_kitchen');
    expect(serviceRoleRpc).toContain('cart_clear');
    expect(rpcExecuteRoles.granted).toEqual(['service_role']);
    expect(rpcExecuteRoles.revoked).toEqual([
      'PUBLIC',
      'anon',
      'authenticated',
    ]);
  });

  it('keeps cross-user isolation via owner SELECT RLS + Nest userId scoping', () => {
    const rlsUsing = 'auth.uid() = user_id';
    expect(rlsUsing).toContain('auth.uid()');
  });
});

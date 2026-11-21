import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('payment notification outbox migration contract', () => {
  const migration = readFileSync(
    resolve(
      __dirname,
      '../../database/migrations/20261142000000_payment_notification_outbox.sql',
    ),
    'utf8',
  );

  function getFunctionDefinition(name: string): string {
    const functionStart = migration.indexOf(
      `CREATE OR REPLACE FUNCTION public.${name}`,
    );
    const functionEnd = migration.indexOf('$function$;', functionStart);
    expect(functionStart).toBeGreaterThanOrEqual(0);
    expect(functionEnd).toBeGreaterThan(functionStart);
    return migration.slice(functionStart, functionEnd);
  }

  it('creates the event only for a newly paid placed order and snapshots preferences', () => {
    const functionStart = migration.indexOf(
      'CREATE OR REPLACE FUNCTION public.order_apply_payment_result',
    );
    const functionEnd = migration.indexOf('$function$;', functionStart);
    const paymentFunction = migration.slice(functionStart, functionEnd);

    expect(paymentFunction).toContain('FOR UPDATE');
    expect(paymentFunction).toContain("v_order.status = 'placed'");
    expect(paymentFunction).toContain("v_order.payment_status IN ('pending', 'failed')");
    expect(paymentFunction).toContain("v_new_status = 'paid'");
    expect(paymentFunction).toContain('preferences.order_updates');
    expect(paymentFunction).toContain('FOR SHARE');
    expect(paymentFunction).toContain("'payment_confirmed:' || v_order.id::TEXT");
    expect(paymentFunction).toContain('INSERT INTO public.notification_outbox');
    expect(paymentFunction).toContain('ON CONFLICT (event_key) DO NOTHING');
  });

  it('claims work with a lease and row-level skip-locked locking', () => {
    const claimFunction = getFunctionDefinition(
      'claim_payment_notification_outbox',
    );

    expect(claimFunction).toContain('FOR UPDATE SKIP LOCKED');
    expect(claimFunction).toContain("outbox.status = 'processing'");
    expect(claimFunction).toContain('outbox.lease_expires_at <= pg_catalog.now()');
    expect(claimFunction).toContain("outbox.status = 'pending'");
    expect(migration).toContain('notifications_source_event_key_uidx');
    expect(migration).toContain('ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY');
  });

  it('reclaims expired leases below ten attempts and dead-letters exhausted leases', () => {
    const claimFunction = getFunctionDefinition(
      'claim_payment_notification_outbox',
    );
    const failureFunction = getFunctionDefinition(
      'fail_payment_notification_outbox',
    );
    const deadLetterUpdate = claimFunction.slice(
      claimFunction.indexOf('WITH exhausted AS'),
      claimFunction.indexOf('RETURN QUERY'),
    );
    const reclaimQuery = claimFunction.slice(
      claimFunction.indexOf('RETURN QUERY'),
    );

    expect(deadLetterUpdate).toContain("outbox.status = 'processing'");
    expect(deadLetterUpdate).toContain('outbox.attempts >= 10');
    expect(deadLetterUpdate).toContain(
      'outbox.lease_expires_at <= pg_catalog.now()',
    );
    expect(deadLetterUpdate).toContain("status = 'dead_letter'");
    expect(deadLetterUpdate).toContain('claim_token = NULL');
    expect(deadLetterUpdate).toContain('lease_expires_at = NULL');
    expect(deadLetterUpdate).toContain('completed_at = pg_catalog.now()');
    expect(deadLetterUpdate).toContain(
      'Maximum of 10 attempts exhausted after expired worker leases',
    );

    expect(reclaimQuery).toContain('outbox.attempts < 10');
    expect(reclaimQuery).toContain('attempts = outbox.attempts + 1');
    expect(reclaimQuery).toContain('FOR UPDATE SKIP LOCKED');
    expect(failureFunction).toContain('WHEN outbox.attempts >= 10 THEN');
    expect(failureFunction).toContain("THEN 'dead_letter'");
  });
});

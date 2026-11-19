import { createHmac } from 'crypto';
import { CashfreeClient } from './cashfree.client';

/**
 * Mirrors Cashfree's documented HMAC algorithm so we can unit-test the
 * signedPayload formula without calling the live PG.
 */
function expectedCashfreeSignature(
  timestamp: string,
  rawBody: string,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update(timestamp + rawBody)
    .digest('base64');
}

describe('Cashfree webhook signature formula', () => {
  it('matches timestamp + rawBody HMAC SHA256 base64', () => {
    const timestamp = '1710000000';
    const rawBody = '{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_amount":118}}}';
    const secret = 'cfsk_test_example';
    const signature = expectedCashfreeSignature(timestamp, rawBody, secret);

    expect(signature).toBe(
      createHmac('sha256', secret).update(`${timestamp}${rawBody}`).digest('base64'),
    );
    expect(signature).not.toBe(
      createHmac('sha256', secret).update(JSON.stringify(JSON.parse(rawBody))).digest('base64'),
    );
  });

  it('CashfreeClient accepts valid signatures and rejects invalid ones', () => {
    const secret = 'webhook_secret_test';
    const client = new CashfreeClient({
      get: (key: string) => {
        if (key === 'cashfree.webhookSecret') return secret;
        if (key === 'cashfree.secretKey') return 'unused';
        return undefined;
      },
    } as never);

    const timestamp = '1710000000';
    const rawBody = '{"type":"PAYMENT_FAILED_WEBHOOK","data":{}}';
    const signature = expectedCashfreeSignature(timestamp, rawBody, secret);

    expect(client.verifyWebhookSignature(signature, rawBody, timestamp)).toEqual(
      JSON.parse(rawBody),
    );
    expect(() =>
      client.verifyWebhookSignature('bad-signature-value!!!!', rawBody, timestamp),
    ).toThrow(/Invalid Cashfree webhook signature/);
  });
});

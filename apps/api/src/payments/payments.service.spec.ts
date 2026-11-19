import { UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { PaymentsService } from './payments.service';

describe('PaymentsService webhook signature handling', () => {
  const secret = 'test_secret_key';

  function buildService(overrides?: {
    verifyWebhookSignature?: (signature: string, rawBody: string, timestamp: string) => unknown;
    applyViaRpc?: boolean;
  }) {
    const admin = {
      rpc: jest.fn(async (name: string) => {
        if (name === 'payment_webhook_event_record') {
          return { data: true, error: null };
        }
        if (name === 'order_apply_payment_result') {
          return {
            data: [{ applied: true, order_id: '11111111-1111-1111-1111-111111111111', payment_status: 'paid', already_paid: false }],
            error: null,
          };
        }
        return { data: null, error: null };
      }),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(async () => ({
          data: {
            id: '11111111-1111-1111-1111-111111111111',
            user_id: '22222222-2222-2222-2222-222222222222',
            order_number: 'A-1001',
            kitchen_id: '33333333-3333-3333-3333-333333333333',
            payment_status: 'pending',
            collector_name: 'Mitra',
            collector_phone: '9876543210',
            total: 118,
            currency: 'INR',
            cashfree_order_id: 'aahaa_11111111-1111-1111-1111-111111111111_1',
            cashfree_cf_order_id: null,
            cashfree_payment_session_id: 'session_1',
            cashfree_payment_id: null,
            payment_session_created_at: null,
            payment_verified_at: null,
          },
          error: null,
        })),
      })),
    };

    const cashfree = {
      verifyWebhookSignature:
        overrides?.verifyWebhookSignature ??
        ((signature: string, rawBody: string, timestamp: string) => {
          const expected = createHmac('sha256', secret)
            .update(timestamp + rawBody)
            .digest('base64');
          if (expected !== signature) {
            throw new Error('signature mismatch');
          }
          return { object: JSON.parse(rawBody) };
        }),
      getFrontendMode: () => 'sandbox' as const,
      getEnvironmentName: () => 'SANDBOX' as const,
    };

    const config = {
      get: (key: string) => {
        if (key === 'cashfree.frontendBaseUrl') return 'http://localhost:5173';
        return undefined;
      },
    };

    return new PaymentsService(
      config as never,
      cashfree as never,
      admin as never,
    );
  }

  it('rejects webhooks with invalid signatures', async () => {
    const service = buildService();
    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', data: {} });
    await expect(
      service.handleWebhook('bad-signature', '1700000000', rawBody),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid signed success webhook', async () => {
    const service = buildService();
    const orderId = '11111111-1111-1111-1111-111111111111';
    const rawBody = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      event_id: 'evt_1',
      data: {
        order: {
          order_id: `aahaa_${orderId}_1`,
          order_amount: 118,
          order_currency: 'INR',
          order_status: 'PAID',
        },
        payment: {
          cf_payment_id: 'pay_1',
          payment_status: 'SUCCESS',
        },
      },
    });
    const timestamp = '1700000000';
    const signature = createHmac('sha256', secret)
      .update(timestamp + rawBody)
      .digest('base64');

    const result = await service.handleWebhook(signature, timestamp, rawBody);
    expect(result).toEqual({ ok: true });
  });

  it('returns duplicate for already-recorded webhook events', async () => {
    const adminRpc = jest.fn(async () => ({ data: false, error: null }));
    const service = new PaymentsService(
      { get: () => 'http://localhost:5173' } as never,
      {
        verifyWebhookSignature: () => ({ object: { type: 'PAYMENT_SUCCESS_WEBHOOK' } }),
      } as never,
      {
        rpc: adminRpc,
        from: jest.fn(),
      } as never,
    );

    const rawBody = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK', event_id: 'evt_dup' });
    const timestamp = '1700000001';
    const signature = 'unused';
    const result = await service.handleWebhook(signature, timestamp, rawBody);
    expect(result).toEqual({ ok: true, duplicate: true });
    expect(createHash('sha256').update(rawBody).digest('hex')).toHaveLength(64);
  });
});

describe('PaymentsService amount mapping helpers', () => {
  it('maps Cashfree PAID to paid and EXPIRED to failed', () => {
    const service = buildBareService();
    expect((service as any).mapCashfreeOrderStatus('PAID')).toBe('paid');
    expect((service as any).mapCashfreeOrderStatus('EXPIRED')).toBe('failed');
    expect((service as any).mapCashfreeOrderStatus('ACTIVE')).toBe('pending');
  });
});

function buildBareService() {
  return new PaymentsService(
    { get: () => undefined } as never,
    {} as never,
    null,
  );
}

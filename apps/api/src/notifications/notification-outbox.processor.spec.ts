import { Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NotificationOutboxProcessor } from './notification-outbox.processor';
import type { NotificationsService } from './notifications.service';

const event = {
  id: 'outbox-1',
  event_key: 'payment_confirmed:order-1',
  event_type: 'payment_confirmed' as const,
  order_id: 'order-1',
  recipient_user_id: 'customer-1',
  order_number: 'AHA-1001',
  order_updates_enabled_at_event: true,
  attempts: 1,
  claim_token: 'claim-1',
};

function createProcessor(options?: {
  notificationResult?: unknown;
  notificationError?: Error;
  claimRows?: unknown[];
  rpc?: jest.Mock;
}) {
  const rpc =
    options?.rpc ??
    jest.fn(async (name: string) => {
      if (name === 'claim_payment_notification_outbox') {
        return { data: options?.claimRows ?? [event], error: null };
      }
      if (name === 'finish_payment_notification_outbox') {
        return { data: true, error: null };
      }
      if (name === 'fail_payment_notification_outbox') {
        return { data: 'pending', error: null };
      }
      return { data: null, error: null };
    });
  const createNotification = jest.fn(async () => {
    if (options?.notificationError) throw options.notificationError;
    if (
      options &&
      Object.prototype.hasOwnProperty.call(options, 'notificationResult')
    ) {
      return options.notificationResult;
    }
    return { id: 'notification-1' };
  });
  const processor = new NotificationOutboxProcessor(
    { rpc } as unknown as SupabaseClient,
    { createNotification } as unknown as NotificationsService,
  );
  return { processor, rpc, createNotification };
}

describe('NotificationOutboxProcessor', () => {
  it('delivers with the event recipient and stable event key', async () => {
    const { processor, rpc, createNotification } = createProcessor();

    await processor.processPendingBatch();

    expect(createNotification).toHaveBeenCalledWith(
      'customer-1',
      expect.objectContaining({
        category: 'order_updates',
        title: 'Payment received — order placed',
        body: 'Payment for order AHA-1001 is confirmed. We’ll update you as its status changes.',
        metadata: { orderId: 'order-1' },
      }),
      'payment_confirmed:order-1',
    );
    expect(rpc).toHaveBeenCalledWith(
      'finish_payment_notification_outbox',
      expect.objectContaining({ p_outcome: 'delivered' }),
    );
  });

  it('does not deliver an event whose preference was off at event time', async () => {
    const { processor, rpc, createNotification } = createProcessor({
      claimRows: [{ ...event, order_updates_enabled_at_event: false }],
    });

    await processor.processPendingBatch();

    expect(createNotification).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      'finish_payment_notification_outbox',
      expect.objectContaining({ p_outcome: 'suppressed' }),
    );
  });

  it('marks an event suppressed when the current preference prevents insertion', async () => {
    const { processor, rpc } = createProcessor({ notificationResult: null });

    await processor.processPendingBatch();

    expect(rpc).toHaveBeenCalledWith(
      'finish_payment_notification_outbox',
      expect.objectContaining({ p_outcome: 'suppressed' }),
    );
  });

  it('records delivery failures for retry without throwing into payment processing', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { processor, rpc } = createProcessor({
      notificationError: new Error('temporary notification write failure'),
    });

    await expect(processor.processPendingBatch()).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith(
      'fail_payment_notification_outbox',
      expect.objectContaining({
        p_event_id: 'outbox-1',
        p_claim_token: 'claim-1',
        p_error_message: 'temporary notification write failure',
      }),
    );

    loggerSpy.mockRestore();
  });

  it('records a failed suppression completion so the claimed event can retry', async () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const rpc = jest.fn(async (name: string) => {
      if (name === 'claim_payment_notification_outbox') {
        return {
          data: [{ ...event, order_updates_enabled_at_event: false }],
          error: null,
        };
      }
      if (name === 'finish_payment_notification_outbox') {
        return { data: null, error: { message: 'temporary completion failure' } };
      }
      if (name === 'fail_payment_notification_outbox') {
        return { data: 'pending', error: null };
      }
      return { data: null, error: null };
    });
    const { processor, createNotification } = createProcessor({ rpc });

    await expect(processor.processPendingBatch()).resolves.toBeUndefined();
    expect(createNotification).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      'fail_payment_notification_outbox',
      expect.objectContaining({
        p_event_id: 'outbox-1',
        p_error_message: 'Unable to finish notification outbox event: temporary completion failure',
      }),
    );

    loggerSpy.mockRestore();
  });

  it('can retry after insertion when completion failed, using the same event key', async () => {
    let claimCount = 0;
    let completionCount = 0;
    const rpc = jest.fn(async (name: string) => {
      if (name === 'claim_payment_notification_outbox') {
        claimCount += 1;
        return { data: [event], error: null };
      }
      if (name === 'finish_payment_notification_outbox') {
        completionCount += 1;
        return completionCount === 1
          ? { data: null, error: { message: 'temporary completion failure' } }
          : { data: true, error: null };
      }
      if (name === 'fail_payment_notification_outbox') {
        return { data: 'pending', error: null };
      }
      return { data: null, error: null };
    });
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const { processor, createNotification } = createProcessor({ rpc });

    await processor.processPendingBatch();
    await processor.processPendingBatch();

    expect(claimCount).toBe(2);
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenNthCalledWith(
      1,
      'customer-1',
      expect.any(Object),
      'payment_confirmed:order-1',
    );
    expect(createNotification).toHaveBeenNthCalledWith(
      2,
      'customer-1',
      expect.any(Object),
      'payment_confirmed:order-1',
    );

    loggerSpy.mockRestore();
  });
});

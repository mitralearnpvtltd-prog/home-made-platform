import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';
import { NotificationsService } from './notifications.service';

type NotificationOutboxEvent = {
  id: string;
  event_key: string;
  event_type: 'payment_confirmed';
  order_id: string;
  recipient_user_id: string;
  order_number: string;
  order_updates_enabled_at_event: boolean;
  attempts: number;
  claim_token: string;
};

type OutboxOutcome = 'delivered' | 'suppressed';

const POLL_INTERVAL_MS = 5_000;
const CLAIM_BATCH_SIZE = 10;
const CLAIM_LEASE_SECONDS = 300;

function isNotificationOutboxEvent(
  value: unknown,
): value is NotificationOutboxEvent {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.event_key === 'string' &&
    row.event_type === 'payment_confirmed' &&
    typeof row.order_id === 'string' &&
    typeof row.recipient_user_id === 'string' &&
    typeof row.order_number === 'string' &&
    typeof row.order_updates_enabled_at_event === 'boolean' &&
    typeof row.attempts === 'number' &&
    typeof row.claim_token === 'string'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

@Injectable()
export class NotificationOutboxProcessor
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationOutboxProcessor.name);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private processing = false;
  private stopping = false;

  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly admin: SupabaseClient | null,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.schedule(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.inFlight;
  }

  async processPendingBatch(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const events = await this.claimEvents();
      for (const event of events) {
        await this.processEvent(event);
      }
    } finally {
      this.processing = false;
    }
  }

  private schedule(delayMs: number): void {
    if (this.stopping) return;

    this.timer = setTimeout(() => {
      this.inFlight = this.processPendingBatch()
        .catch((error: unknown) => {
          this.logger.error(
            `Notification outbox polling failed: ${errorMessage(error)}`,
            error instanceof Error ? error.stack : undefined,
          );
        })
        .finally(() => {
          this.inFlight = null;
          this.schedule(POLL_INTERVAL_MS);
        });
    }, delayMs);
  }

  private async claimEvents(): Promise<NotificationOutboxEvent[]> {
    const client = this.requireAdmin();
    const { data, error } = await client.rpc(
      'claim_payment_notification_outbox',
      {
        p_batch_size: CLAIM_BATCH_SIZE,
        p_lease_seconds: CLAIM_LEASE_SECONDS,
      },
    );

    if (error) {
      throw new Error(`Unable to claim notification outbox events: ${error.message}`);
    }
    if (data === null) return [];
    if (!Array.isArray(data)) {
      throw new Error('Notification outbox claim returned an invalid response.');
    }

    const events: NotificationOutboxEvent[] = [];
    for (const row of data as unknown[]) {
      if (!isNotificationOutboxEvent(row)) {
        throw new Error('Notification outbox claim returned an invalid event.');
      }
      events.push(row);
    }
    return events;
  }

  private async processEvent(event: NotificationOutboxEvent): Promise<void> {
    try {
      if (!event.order_updates_enabled_at_event) {
        await this.finishEvent(event, 'suppressed');
        return;
      }

      const notification = await this.notifications.createNotification(
        event.recipient_user_id,
        {
          category: 'order_updates',
          title: 'Payment received — order placed',
          body: `Payment for order ${event.order_number} is confirmed. We’ll update you as its status changes.`,
          iconType: 'order',
          actionUrl: '/my-orders',
          metadata: { orderId: event.order_id },
        },
        event.event_key,
      );

      await this.finishEvent(
        event,
        notification ? 'delivered' : 'suppressed',
      );
    } catch (error) {
      await this.recordFailure(event, error);
    }
  }

  private async finishEvent(
    event: NotificationOutboxEvent,
    outcome: OutboxOutcome,
  ): Promise<void> {
    const { data, error } = await this.requireAdmin().rpc(
      'finish_payment_notification_outbox',
      {
        p_event_id: event.id,
        p_claim_token: event.claim_token,
        p_outcome: outcome,
      },
    );

    if (error) {
      throw new Error(`Unable to finish notification outbox event: ${error.message}`);
    }
    if (data !== true) {
      this.logger.warn(
        `Notification outbox claim expired before completion for event ${event.event_key}.`,
      );
    }
  }

  private async recordFailure(
    event: NotificationOutboxEvent,
    error: unknown,
  ): Promise<void> {
    const message = errorMessage(error);
    try {
      const { data, error: rpcError } = await this.requireAdmin().rpc(
        'fail_payment_notification_outbox',
        {
          p_event_id: event.id,
          p_claim_token: event.claim_token,
          p_error_message: message,
        },
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }
      if (data === 'dead_letter') {
        this.logger.error(
          `Notification outbox event ${event.event_key} reached dead letter after ${event.attempts} attempts: ${message}`,
        );
      } else if (data === 'pending') {
        this.logger.warn(
          `Notification outbox event ${event.event_key} will retry after delivery failure: ${message}`,
        );
      } else {
        this.logger.warn(
          `Notification outbox failure for ${event.event_key} could not update its claim (${String(data)}); its lease will expire.`,
        );
      }
    } catch (recordError) {
      this.logger.error(
        `Could not persist failure for notification outbox event ${event.event_key}; its lease will expire. Delivery error: ${message}. Failure-recording error: ${errorMessage(recordError)}`,
        recordError instanceof Error ? recordError.stack : undefined,
      );
    }
  }

  private requireAdmin(): SupabaseClient {
    if (!this.admin) {
      throw new Error(
        'Notification outbox processing requires SUPABASE_SERVICE_ROLE_KEY on the API server.',
      );
    }
    return this.admin;
  }
}

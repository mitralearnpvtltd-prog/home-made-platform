import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';
import type { CreateNotificationDto } from './dto/create-notification.dto';
import type { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import type { NotificationPreferences } from './notifications.constants';
import type {
  NotificationDto,
  NotificationPreferencesDto,
  NotificationPreferencesRow,
  NotificationRow,
} from './notifications.types';

const NOTIFICATION_SELECT =
  'id, user_id, category, title, body, icon_type, action_url, metadata, is_read, read_at, dismissed_at, created_at';
const PREFERENCES_SELECT =
  'user_id, order_updates, offers_promotions, nearby_home_cooks, general_updates, updated_at';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly admin: SupabaseClient | null,
  ) {}

  async list(userId: string): Promise<NotificationDto[]> {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('notifications')
      .select(NOTIFICATION_SELECT)
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      this.throwReadError(error.message, 'Unable to load notifications');
    }

    return ((data ?? []) as NotificationRow[]).map((row) =>
      this.toNotificationDto(row),
    );
  }

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const client = this.requireAdmin();
    const { count, error } = await client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('dismissed_at', null);

    if (error) {
      this.throwReadError(error.message, 'Unable to load unread count');
    }

    return { unreadCount: count ?? 0 };
  }

  async markRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDto> {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select(NOTIFICATION_SELECT)
      .maybeSingle();

    if (error) {
      this.throwWriteError(error.message, 'Unable to mark notification as read');
    }
    if (!data) {
      throw new NotFoundException('Notification not found');
    }

    return this.toNotificationDto(data as NotificationRow);
  }

  async markAllRead(userId: string): Promise<{ updatedCount: number }> {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
      .is('dismissed_at', null)
      .select('id');

    if (error) {
      this.throwWriteError(error.message, 'Unable to mark notifications as read');
    }

    return { updatedCount: data?.length ?? 0 };
  }

  async dismiss(
    userId: string,
    notificationId: string,
  ): Promise<{ dismissed: true; notificationId: string }> {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      this.throwWriteError(error.message, 'Unable to dismiss notification');
    }
    if (!data) {
      throw new NotFoundException('Notification not found');
    }

    return { dismissed: true, notificationId };
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesDto> {
    return this.toPreferencesDto(await this.loadPreferences(userId));
  }

  async updatePreferences(
    userId: string,
    preferences: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDto> {
    if (Object.keys(preferences).length === 0) {
      throw new BadRequestException(
        'At least one notification preference must be provided.',
      );
    }

    const client = this.requireAdmin();
    await this.ensurePreferences(client, userId);
    const { data, error } = await client
      .from('notification_preferences')
      .update(preferences)
      .eq('user_id', userId)
      .select(PREFERENCES_SELECT)
      .maybeSingle();

    if (error) {
      this.throwWriteError(
        error.message,
        'Unable to update notification preferences',
      );
    }
    if (!data) {
      throw new ServiceUnavailableException(
        'Unable to load notification preferences after update.',
      );
    }

    return this.toPreferencesDto(data as NotificationPreferencesRow);
  }

  /**
   * Shared creation path for future order events and admin publishing.
   * The database trigger also enforces preferences for concurrent changes and
   * any other insertion path.
   */
  async createNotification(
    userId: string,
    notification: CreateNotificationDto,
    sourceEventKey?: string,
  ): Promise<NotificationDto | null> {
    let eventKey: string | undefined;
    if (sourceEventKey !== undefined) {
      eventKey = sourceEventKey.trim();
      if (!eventKey || eventKey.length > 160) {
        throw new BadRequestException('Notification event key is invalid.');
      }
    }

    const client = this.requireAdmin();
    const preferences = await this.loadPreferences(userId);
    if (!preferences[notification.category]) {
      if (eventKey === undefined) return null;
      const existing = await this.findNotificationByEventKey(
        client,
        eventKey,
        userId,
      );
      return existing ? this.toNotificationDto(existing) : null;
    }

    const values = {
      user_id: userId,
      category: notification.category,
      title: notification.title,
      body: notification.body,
      icon_type: notification.iconType ?? null,
      action_url: notification.actionUrl ?? null,
      metadata: notification.metadata ?? {},
    };

    if (eventKey === undefined) {
      const { data, error } = await client
        .from('notifications')
        .insert(values)
        .select(NOTIFICATION_SELECT)
        .maybeSingle();

      if (error) {
        this.throwWriteError(error.message, 'Unable to create notification');
      }

      return data ? this.toNotificationDto(data as NotificationRow) : null;
    }

    const { data, error } = await client
      .from('notifications')
      .upsert(
        { ...values, source_event_key: eventKey },
        { onConflict: 'source_event_key', ignoreDuplicates: true },
      )
      .select(NOTIFICATION_SELECT)
      .maybeSingle();

    if (error) {
      this.throwWriteError(error.message, 'Unable to create notification');
    }
    if (data) {
      return this.toNotificationDto(data as NotificationRow);
    }

    const existing = await this.findNotificationByEventKey(
      client,
      eventKey,
      userId,
    );

    // The unique event key makes a retry after an insert/ack crash return the
    // original notification instead of inserting a duplicate.
    return existing ? this.toNotificationDto(existing) : null;
  }

  private async findNotificationByEventKey(
    client: SupabaseClient,
    eventKey: string,
    userId: string,
  ): Promise<NotificationRow | null> {
    const { data, error } = await client
      .from('notifications')
      .select(NOTIFICATION_SELECT)
      .eq('source_event_key', eventKey)
      .maybeSingle();

    if (error) {
      this.throwReadError(
        error.message,
        'Unable to confirm notification event delivery',
      );
    }
    if (!data) return null;
    const existing = data as NotificationRow;
    if (existing.user_id !== userId) {
      throw new ServiceUnavailableException(
        'Notification event key is already associated with another customer.',
      );
    }
    return existing;
  }

  private async loadPreferences(
    userId: string,
  ): Promise<NotificationPreferencesRow> {
    const client = this.requireAdmin();
    await this.ensurePreferences(client, userId);

    const { data, error } = await client
      .from('notification_preferences')
      .select(PREFERENCES_SELECT)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      this.throwReadError(
        error.message,
        'Unable to load notification preferences',
      );
    }
    if (!data) {
      throw new ServiceUnavailableException(
        'Unable to initialize notification preferences for this customer.',
      );
    }

    return data as NotificationPreferencesRow;
  }

  private async ensurePreferences(
    client: SupabaseClient,
    userId: string,
  ): Promise<void> {
    const { error } = await client
      .from('notification_preferences')
      .upsert(
        { user_id: userId },
        { onConflict: 'user_id', ignoreDuplicates: true },
      );

    if (error) {
      this.throwWriteError(
        error.message,
        'Unable to initialize notification preferences',
      );
    }
  }

  private toNotificationDto(row: NotificationRow): NotificationDto {
    return {
      id: row.id,
      category: row.category,
      title: row.title,
      body: row.body,
      iconType: row.icon_type,
      actionUrl: row.action_url,
      metadata: row.metadata,
      isRead: row.is_read,
      readAt: row.read_at,
      dismissedAt: row.dismissed_at,
      createdAt: row.created_at,
    };
  }

  private toPreferencesDto(
    row: NotificationPreferencesRow,
  ): NotificationPreferencesDto {
    const preferences: NotificationPreferences = {
      order_updates: row.order_updates,
      offers_promotions: row.offers_promotions,
      nearby_home_cooks: row.nearby_home_cooks,
      general_updates: row.general_updates,
    };

    return { ...preferences, updatedAt: row.updated_at };
  }

  private requireAdmin(): SupabaseClient {
    if (!this.admin) {
      throw new ServiceUnavailableException(
        'Notification persistence requires SUPABASE_SERVICE_ROLE_KEY on the API server only.',
      );
    }
    return this.admin;
  }

  private throwReadError(message: string, fallback: string): never {
    if (/does not exist|relation .*notification/i.test(message)) {
      throw new ServiceUnavailableException(
        'Notification tables are missing. Apply migration 20261141000000_notifications.sql, then retry.',
      );
    }
    throw new ServiceUnavailableException(fallback);
  }

  private throwWriteError(message: string, fallback: string): never {
    this.throwReadError(message, fallback);
  }
}

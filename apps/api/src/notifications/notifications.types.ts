import type {
  NotificationCategory,
  NotificationPreferences,
} from './notifications.constants';

export type NotificationDto = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  iconType: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
};

export type NotificationPreferencesDto = NotificationPreferences & {
  updatedAt: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  icon_type: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

export type NotificationPreferencesRow = NotificationPreferences & {
  user_id: string;
  updated_at: string;
};

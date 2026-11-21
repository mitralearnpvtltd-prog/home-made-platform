export const NOTIFICATION_CATEGORIES = [
  'order_updates',
  'offers_promotions',
  'nearby_home_cooks',
  'general_updates',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationPreferences = {
  order_updates: boolean;
  offers_promotions: boolean;
  nearby_home_cooks: boolean;
  general_updates: boolean;
};

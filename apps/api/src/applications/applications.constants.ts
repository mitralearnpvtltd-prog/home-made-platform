export const APPLICATION_PHOTO_BUCKET = 'application-profile-photos';
export const APPLICATION_RETENTION_DAYS = 365;
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PROFILE_PHOTO_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export const COOK_FOOD_TYPES = ['homemade_meals', 'snacks'] as const;
export const COOK_FOOD_CATEGORIES = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
] as const;

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

import { WEEKDAYS } from './applications.constants';

export type AvailableDaysMode =
  | 'all_days'
  | 'weekdays'
  | 'weekends'
  | 'choose_days';

export type WorkingHoursMode = 'full_app' | 'custom';

const DAY_PRESETS: Record<Exclude<AvailableDaysMode, 'choose_days'>, string[]> = {
  all_days: [...WEEKDAYS],
  weekdays: [...WEEKDAYS.slice(0, 5)],
  weekends: [...WEEKDAYS.slice(5)],
};

function isValidDayArray(days: unknown): days is string[] {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    new Set(days).size === days.length &&
    days.every(
      (day) =>
        typeof day === 'string' &&
        WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]),
    )
  );
}

export function isValidAvailableDays(
  mode: unknown,
  days: unknown,
): days is string[] {
  if (!isValidDayArray(days)) return false;
  if (mode === 'choose_days') return true;
  if (mode !== 'all_days' && mode !== 'weekdays' && mode !== 'weekends') {
    return false;
  }
  const expectedDays = DAY_PRESETS[mode];
  return (
    days.length === expectedDays.length &&
    expectedDays.every((day, index) => days[index] === day)
  );
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function isAahaaOperatingTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(18|19|20):(00|30)$|^21:00$/.test(value)
  );
}

export function isValidWorkingHours(
  mode: unknown,
  from: unknown,
  until: unknown,
): boolean {
  if (mode === 'full_app') return from === '18:00' && until === '21:00';
  return (
    mode === 'custom' &&
    isAahaaOperatingTime(from) &&
    isAahaaOperatingTime(until) &&
    timeToMinutes(until) > timeToMinutes(from)
  );
}

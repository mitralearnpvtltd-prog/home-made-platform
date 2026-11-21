import { WEEKDAYS } from './applications.constants';

export type AvailabilityMode = 'shared' | 'per_day';

export type DailyAvailability = {
  from: string;
  until: string;
};

export type AvailabilityByDay = Record<string, DailyAvailability>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function isValidAvailabilitySchedule(
  days: unknown,
  mode: unknown,
  schedule: unknown,
): schedule is AvailabilityByDay {
  if (
    !Array.isArray(days) ||
    days.length === 0 ||
    !days.every(
      (day): day is string =>
        typeof day === 'string' &&
        WEEKDAYS.includes(day as (typeof WEEKDAYS)[number]),
    ) ||
    new Set(days).size !== days.length ||
    (mode !== 'shared' && mode !== 'per_day') ||
    !isRecord(schedule)
  ) {
    return false;
  }

  const selectedDays = new Set(days);
  const scheduleDays = Object.keys(schedule);
  if (
    scheduleDays.length !== selectedDays.size ||
    scheduleDays.some((day) => !selectedDays.has(day))
  ) {
    return false;
  }

  let sharedTiming: DailyAvailability | undefined;
  for (const day of days) {
    const timing = schedule[day];
    if (
      !isRecord(timing) ||
      Object.keys(timing).length !== 2 ||
      typeof timing.from !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(timing.from) ||
      typeof timing.until !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(timing.until) ||
      timeToMinutes(timing.until) <= timeToMinutes(timing.from)
    ) {
      return false;
    }

    if (mode === 'shared') {
      if (
        sharedTiming &&
        (timing.from !== sharedTiming.from ||
          timing.until !== sharedTiming.until)
      ) {
        return false;
      }
      sharedTiming = { from: timing.from, until: timing.until };
    }
  }

  return true;
}

export function getAvailabilityRange(
  schedule: AvailabilityByDay,
): { from: string; until: string } | null {
  const timings = Object.values(schedule);
  if (!timings.length) return null;

  return {
    from: timings.reduce((earliest, timing) =>
      timeToMinutes(timing.from) < timeToMinutes(earliest.from)
        ? timing
        : earliest,
    ).from,
    until: timings.reduce((latest, timing) =>
      timeToMinutes(timing.until) > timeToMinutes(latest.until)
        ? timing
        : latest,
    ).until,
  };
}

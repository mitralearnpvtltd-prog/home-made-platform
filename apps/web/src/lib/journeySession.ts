import {
  FIXED_PICKUP_POINT,
  type JourneyChoice,
  INITIAL_JOURNEY,
} from "../cookData";

const JOURNEY_KEY = "aahaa.journey.selection";

type StoredJourney = {
  from: string;
  to: string;
  pickup: string;
  dateIso: string;
};

function parseStored(raw: string | null): JourneyChoice | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as StoredJourney;
    if (!data || typeof data !== "object") return null;
    const from = typeof data.from === "string" ? data.from.trim() : "";
    const to = typeof data.to === "string" ? data.to.trim() : "";
    const pickup =
      typeof data.pickup === "string" && data.pickup.trim()
        ? data.pickup.trim()
        : FIXED_PICKUP_POINT;
    const parsedDate = data.dateIso ? new Date(data.dateIso) : null;
    const date =
      parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate
        : INITIAL_JOURNEY.date;
    return { from, to, pickup, date };
  } catch {
    return null;
  }
}

/** Restore the passenger's current journey selection (not an order snapshot). */
export function readJourneySelection(): JourneyChoice {
  try {
    return parseStored(sessionStorage.getItem(JOURNEY_KEY)) ?? { ...INITIAL_JOURNEY };
  } catch {
    return { ...INITIAL_JOURNEY };
  }
}

/** Persist the live journey bar selection so remounts / checkout keep From & To. */
export function writeJourneySelection(journey: JourneyChoice): void {
  try {
    const payload: StoredJourney = {
      from: journey.from.trim(),
      to: journey.to.trim(),
      pickup: journey.pickup.trim() || FIXED_PICKUP_POINT,
      dateIso: journey.date.toISOString(),
    };
    sessionStorage.setItem(JOURNEY_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

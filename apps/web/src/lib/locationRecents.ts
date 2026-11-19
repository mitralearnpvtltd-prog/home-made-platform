import { isBengaluruPlace } from "../cookData";

export type RecentLocationEntry = {
  title: string;
  action: string;
};

export type LocationRecentKind = "from" | "to";

const STORAGE_KEYS: Record<LocationRecentKind, string> = {
  from: "aahaa.locationRecents.from",
  to: "aahaa.locationRecents.to",
};

const MAX_RECENTS = 5;
const RECENT_ACTION = "Route";

function normalizeTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const title = value.trim();
  if (!title) return null;
  return title;
}

function isAllowedRecent(kind: LocationRecentKind, title: string): boolean {
  if (isBengaluruPlace(title)) return false;
  if (kind === "from" && /^(chennai|hyderabad|kochi|coimbatore|salem)$/i.test(title)) {
    return false;
  }
  if (kind === "to" && /^(chennai|hyderabad|kochi|coimbatore|salem)$/i.test(title)) {
    return false;
  }
  return true;
}

function sanitizeEntries(
  kind: LocationRecentKind,
  value: unknown,
): RecentLocationEntry[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const entries: RecentLocationEntry[] = [];

  for (const item of value) {
    const title =
      typeof item === "string"
        ? normalizeTitle(item)
        : item && typeof item === "object"
          ? normalizeTitle((item as { title?: unknown }).title)
          : null;

    if (!title || !isAllowedRecent(kind, title)) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ title, action: RECENT_ACTION });
    if (entries.length >= MAX_RECENTS) break;
  }

  return entries;
}

function readStorage(kind: LocationRecentKind): RecentLocationEntry[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEYS[kind]);
    if (!raw) return [];
    return sanitizeEntries(kind, JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeStorage(kind: LocationRecentKind, entries: RecentLocationEntry[]) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(entries));
  } catch {
    // Ignore quota / privacy-mode failures; in-memory list still works for the session.
  }
}

function notifyRecentsChanged() {
  try {
    window.dispatchEvent(new Event("aahaa-location-recents"));
  } catch {
    // Ignore environments without window events.
  }
}

export function loadLocationRecents(kind: LocationRecentKind): RecentLocationEntry[] {
  return readStorage(kind);
}

export function rememberLocationRecent(
  kind: LocationRecentKind,
  name: string,
): RecentLocationEntry[] {
  const title = normalizeTitle(name);
  if (!title || !isAllowedRecent(kind, title)) {
    return readStorage(kind);
  }

  const next = sanitizeEntries(kind, [
    { title, action: RECENT_ACTION },
    ...readStorage(kind),
  ]);
  writeStorage(kind, next);
  notifyRecentsChanged();
  return next;
}

export function clearLocationRecents(kind: LocationRecentKind): RecentLocationEntry[] {
  writeStorage(kind, []);
  notifyRecentsChanged();
  return [];
}

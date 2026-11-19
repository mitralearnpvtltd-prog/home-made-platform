/**
 * Journey tracking geography for Track Your Order.
 *
 * Delivery route is ALWAYS: saved From locality → Bangalore (Majestic) pickup.
 * The customer's To destination is Saved Journey metadata only — never a route end.
 *
 * Coordinates come from `trackingPlaces.generated.json`, verified via Photon /
 * Nominatim against the live locations catalogue names. Unknown names resolve
 * to null so the map never fabricates markers or routes.
 *
 * Live DB still has no lat/lng columns on locations/pickup_stops. When those
 * migrate, prefer loading coordinates from the API over this catalogue.
 */

import { TRACKING_PLACES, type TrackingPlaceEntry } from "./trackingPlaces.generated";

export type GeoPoint = {
  lat: number;
  lng: number;
  label: string;
  source: "osm-nominatim" | "photon-komoot" | "database";
  osmRef?: string;
};

type PlaceEntry = TrackingPlaceEntry;

const VERIFIED_PLACES = TRACKING_PLACES;

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/bengalur[ue]/g, "bangalore")
    .replace(/[’']/g, "")
    .replace(/\s+/g, " ");
}

const PLACE_INDEX = new Map<string, PlaceEntry>();
for (const place of VERIFIED_PLACES) {
  for (const key of place.keys) {
    PLACE_INDEX.set(normalizeKey(key), place);
  }
  PLACE_INDEX.set(normalizeKey(place.label), place);
}

export function resolvePlaceCoords(
  name: string | null | undefined,
  fallbackLabel?: string,
): GeoPoint | null {
  if (!name?.trim()) return null;
  const hit = PLACE_INDEX.get(normalizeKey(name));
  if (!hit) return null;
  const source =
    hit.source === "osm-nominatim"
      ? "osm-nominatim"
      : hit.source === "database"
        ? "database"
        : "photon-komoot";
  return {
    lat: hit.lat,
    lng: hit.lng,
    label: fallbackLabel?.trim() || hit.label,
    source,
    osmRef: hit.osmRef,
  };
}

/** Fixed Aahaa pickup — Majestic / Kempegowda Bus Station. */
export function resolvePickupCoords(
  pickupStopName: string | null | undefined,
): GeoPoint | null {
  const raw = pickupStopName?.trim() || "Bangalore";
  const label =
    /^(bangalore|bengaluru)$/i.test(raw) || /bus stand/i.test(raw)
      ? "Majestic Bus Stand"
      : raw;
  return (
    resolvePlaceCoords("Majestic Bus Stand", label) ||
    resolvePlaceCoords(raw, label) ||
    resolvePlaceCoords("Bangalore", label)
  );
}

export function resolveJourneyFromCoords(
  journeyFrom: string | null | undefined,
): GeoPoint | null {
  return resolvePlaceCoords(journeyFrom);
}

export function resolveJourneyToCoords(
  journeyTo: string | null | undefined,
): GeoPoint | null {
  return resolvePlaceCoords(journeyTo);
}

export type JourneyMapPoints = {
  from: GeoPoint | null;
  to: GeoPoint | null;
  pickup: GeoPoint | null;
};

export function resolveOrderJourneyPoints(input: {
  journeyFrom: string | null | undefined;
  journeyTo: string | null | undefined;
  pickupStopName: string | null | undefined;
}): JourneyMapPoints {
  return {
    from: resolveJourneyFromCoords(input.journeyFrom),
    to: resolveJourneyToCoords(input.journeyTo),
    pickup: resolvePickupCoords(input.pickupStopName),
  };
}

/** Delivery bike route endpoints: saved From → Majestic pickup only. */
export function deliveryRouteEndpoints(points: JourneyMapPoints): {
  start: GeoPoint | null;
  end: GeoPoint | null;
} {
  return {
    start: points.from,
    end: points.pickup,
  };
}

export function deliveryRoutePoints(points: JourneyMapPoints): GeoPoint[] {
  const { start, end } = deliveryRouteEndpoints(points);
  return [start, end].filter((point): point is GeoPoint => Boolean(point));
}

/** Map fit bounds follow the delivery route, not the customer's To city. */
export function journeyPointsForBounds(points: JourneyMapPoints): GeoPoint[] {
  return deliveryRoutePoints(points);
}

export function missingJourneyCoordLabels(input: {
  journeyFrom: string | null | undefined;
  journeyTo: string | null | undefined;
  pickupStopName: string | null | undefined;
}): string[] {
  const missing: string[] = [];
  if (input.journeyFrom?.trim() && !resolveJourneyFromCoords(input.journeyFrom)) {
    missing.push(`From: ${input.journeyFrom.trim()}`);
  }
  if (!resolvePickupCoords(input.pickupStopName || "Bangalore")) {
    missing.push("Pickup: Majestic Bus Stand");
  }
  if (input.journeyTo?.trim() && !resolveJourneyToCoords(input.journeyTo)) {
    missing.push(`To (display only): ${input.journeyTo.trim()}`);
  }
  return missing;
}

export function missingDeliveryRouteCoordLabels(input: {
  journeyFrom: string | null | undefined;
  pickupStopName: string | null | undefined;
}): string[] {
  const missing: string[] = [];
  if (!input.journeyFrom?.trim()) {
    missing.push("From: (not saved on order)");
  } else if (!resolveJourneyFromCoords(input.journeyFrom)) {
    missing.push(`From: ${input.journeyFrom.trim()}`);
  }
  if (!resolvePickupCoords(input.pickupStopName || "Bangalore")) {
    missing.push("Pickup: Majestic Bus Stand");
  }
  return missing;
}

export function verifiedPlaceCount(): number {
  return VERIFIED_PLACES.length;
}

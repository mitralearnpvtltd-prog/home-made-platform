import { useEffect, useId, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint, JourneyMapPoints } from "../lib/trackingGeo";
import {
  deliveryRouteEndpoints,
  deliveryRoutePoints,
  journeyPointsForBounds,
} from "../lib/trackingGeo";
import courierBikeUrl from "../assets/track/track-courier-bike-marker.jpg";

type TrackOrderMapProps = {
  points: JourneyMapPoints;
  fromLabel: string;
  toLabel: string;
  pickupLabel: string;
  missingCoordLabels?: string[];
  journeyMissing?: boolean;
  /** Reserved for future genuine GPS updates. Never invent motion without this. */
  courierGps?: GeoPoint | null;
};

type RouteState = "idle" | "loading" | "ready" | "unavailable";

/** Esri World Street Map + OSM data require attribution; keep compact but present. */
const MAP_ATTRIBUTION =
  '<a href="https://www.esri.com/">Esri</a> · <a href="https://www.openstreetmap.org/copyright">OSM</a>';

function markerIcon(kind: "from" | "pickup"): L.DivIcon {
  const className = `ck-leaflet-marker ck-leaflet-marker--${kind}`;
  const label = kind === "from" ? "A" : "P";
  return L.divIcon({
    className: "ck-leaflet-marker-wrap",
    html: `<span class="${className}" aria-hidden="true">${label}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function courierIcon(): L.DivIcon {
  return L.divIcon({
    className: "ck-leaflet-marker-wrap ck-leaflet-courier-wrap",
    html: `<span class="ck-leaflet-courier" title="Delivery courier">
      <img src="${courierBikeUrl}" alt="" width="56" height="56" />
    </span>`,
    iconSize: [64, 64],
    iconAnchor: [32, 56],
  });
}

function pointKey(point: GeoPoint | null): string {
  return point ? `${point.lat},${point.lng},${point.label}` : "";
}

function midpointOnRoute(geometry: L.LatLngExpression[]): L.LatLngExpression | null {
  if (!geometry.length) return null;
  return geometry[Math.floor(geometry.length / 2)] ?? null;
}

async function fetchOsrmRoute(points: GeoPoint[]): Promise<L.LatLngExpression[] | null> {
  if (points.length < 2) return null;
  const path = points.map((point) => `${point.lng},${point.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      code?: string;
      routes?: Array<{ geometry?: { coordinates?: number[][] } }>;
    };
    if (payload.code !== "Ok") return null;
    const coords = payload.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) return null;
    return coords.map(([lng, lat]) => [lat, lng] as L.LatLngExpression);
  } catch {
    return null;
  }
}

function fitDeliveryBounds(map: L.Map, points: GeoPoint[]) {
  if (points.length >= 2) {
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds.pad(0.35), { animate: false, maxZoom: 14 });
    return;
  }
  if (points.length === 1) {
    map.setView([points[0].lat, points[0].lng], 13, { animate: false });
    return;
  }
  map.setView([12.9716, 77.5946], 12, { animate: false });
}

export function TrackOrderMap({
  points,
  fromLabel,
  pickupLabel,
  missingCoordLabels = [],
  journeyMissing = false,
  courierGps = null,
}: TrackOrderMapProps) {
  const reactId = useId().replace(/:/g, "");
  const mapId = `ck-track-map-${reactId}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const routeUnderlayRef = useRef<L.Polyline | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [routeState, setRouteState] = useState<RouteState>("idle");

  const routeEndpoints = deliveryRouteEndpoints(points);
  const boundPoints = journeyPointsForBounds(points);
  const hasDeliveryMarkers = boundPoints.length > 0;
  const canRoute = Boolean(routeEndpoints.start && routeEndpoints.end);
  const pointsKey = [
    pointKey(points.from),
    pointKey(points.pickup),
    pointKey(courierGps),
  ].join("|");

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
    });

    // Required by Esri / OSM licence — compact control, no Leaflet prefix.
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(map);

    // Esri World Street Map — light roads + locality labels (not Google Maps).
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: MAP_ATTRIBUTION,
        maxZoom: 19,
      },
    ).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    map.setView([12.9716, 77.5946], 12);

    const onResize = () => {
      map.invalidateSize();
      if (boundPoints.length) fitDeliveryBounds(map, journeyPointsForBounds(points));
    };
    window.addEventListener("resize", onResize);

    // Leaflet often needs a delayed invalidate when laid out in CSS grids.
    const t1 = window.setTimeout(() => map.invalidateSize(), 80);
    const t2 = window.setTimeout(() => map.invalidateSize(), 320);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      routeUnderlayRef.current = null;
      routeLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layerRef.current;
    if (!map || !layers) return;

    layers.clearLayers();
    if (routeUnderlayRef.current) {
      map.removeLayer(routeUnderlayRef.current);
      routeUnderlayRef.current = null;
    }
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    const { start, end } = deliveryRouteEndpoints(points);
    const fitPoints = journeyPointsForBounds(points);

    if (start) {
      L.marker([start.lat, start.lng], { icon: markerIcon("from"), zIndexOffset: 400 })
        .bindTooltip(`From · ${fromLabel || start.label}`, { direction: "top", opacity: 0.95 })
        .addTo(layers);
    }
    if (end) {
      L.marker([end.lat, end.lng], { icon: markerIcon("pickup"), zIndexOffset: 450 })
        .bindTooltip(`Pickup · ${pickupLabel || end.label}`, { direction: "top", opacity: 0.95 })
        .addTo(layers);
    }

    fitDeliveryBounds(map, fitPoints);
    requestAnimationFrame(() => {
      map.invalidateSize();
      fitDeliveryBounds(map, fitPoints);
    });

    let cancelled = false;
    const routePoints = deliveryRoutePoints(points);

    function placeCourier(at: L.LatLngExpression) {
      if (!layers) return;
      const live = Boolean(courierGps);
      L.marker(at, { icon: courierIcon(), zIndexOffset: 800 })
        .bindTooltip(
          live
            ? "Delivery courier · live GPS"
            : "Delivery courier · Live GPS not available yet",
          { direction: "top", opacity: 0.95 },
        )
        .addTo(layers);
    }

    if (courierGps) {
      placeCourier([courierGps.lat, courierGps.lng]);
    }

    if (routePoints.length < 2) {
      if (!courierGps && start) placeCourier([start.lat, start.lng]);
      setRouteState(canRoute ? "unavailable" : "idle");
      return () => {
        cancelled = true;
      };
    }

    setRouteState("loading");
    void fetchOsrmRoute(routePoints).then((geometry) => {
      if (cancelled || !mapRef.current || !layerRef.current) return;
      if (!geometry?.length) {
        if (!courierGps && start) placeCourier([start.lat, start.lng]);
        setRouteState("unavailable");
        return;
      }

      routeUnderlayRef.current = L.polyline(geometry, {
        color: "#174ea6",
        weight: 10,
        opacity: 0.2,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(layerRef.current);

      routeLayerRef.current = L.polyline(geometry, {
        color: "#1a73e8",
        weight: 5,
        opacity: 0.98,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(mapRef.current);

      const routeBounds = L.latLngBounds(geometry);
      const applyFit = () => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize();
        mapRef.current.fitBounds(routeBounds.pad(0.32), { animate: false, maxZoom: 13 });
      };
      applyFit();
      window.setTimeout(applyFit, 120);
      window.setTimeout(applyFit, 400);

      if (!courierGps) {
        const mid = midpointOnRoute(geometry);
        if (mid) placeCourier(mid);
      }

      setRouteState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [pointsKey, fromLabel, pickupLabel, points, courierGps, canRoute]);

  function recenter() {
    const map = mapRef.current;
    if (!map) return;
    if (routeLayerRef.current) {
      map.fitBounds(routeLayerRef.current.getBounds().pad(0.28), { maxZoom: 14 });
      return;
    }
    fitDeliveryBounds(map, journeyPointsForBounds(points));
  }

  const showBanner =
    journeyMissing ||
    !hasDeliveryMarkers ||
    missingCoordLabels.length > 0 ||
    routeState === "unavailable";

  return (
    <section className="ck-track-map" aria-label={`Delivery route to ${pickupLabel}`}>
      <div id={mapId} ref={containerRef} className="ck-track-map-canvas" />

      {showBanner ? (
        <div className="ck-track-map-banner" role="status">
          <strong>
            {journeyMissing
              ? "Saved journey missing"
              : !hasDeliveryMarkers
                ? "Delivery map ready"
                : routeState === "unavailable"
                  ? "Markers shown · route unavailable"
                  : "Partial delivery coordinates"}
          </strong>
          <p>
            {journeyMissing
              ? "This order has no saved From / To journey snapshot. The map cannot invent locations. Place a new order with From and To selected to see the delivery route."
              : !hasDeliveryMarkers
                ? "Verified From and Majestic pickup coordinates are missing, so markers and the route stay hidden."
                : missingCoordLabels.length > 0
                  ? `Missing verified coordinates for: ${missingCoordLabels.join("; ")}. Delivery routing only uses From → Majestic pickup.`
                  : routeState === "unavailable"
                    ? "A driving route from From to Majestic pickup could not be retrieved. Markers remain without a fabricated path."
                    : "Showing the verified From → Majestic pickup delivery route from the order snapshot."}
          </p>
        </div>
      ) : null}

      <div className="ck-map-controls">
        <button type="button" aria-label="Recenter map" onClick={recenter}>
          ◎
        </button>
      </div>
    </section>
  );
}

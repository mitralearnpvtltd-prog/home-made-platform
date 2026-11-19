import { useEffect, useState } from "react";
import { isBengaluruPlace } from "../cookData";
import {
  searchLocations,
  type LocationSearchType,
} from "./api";

export type LocationSuggestItem = {
  title: string;
  city: string;
};

export type LocationSuggestStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";

const DEBOUNCE_MS = 280;
const SEARCH_LIMIT = 10;

export function useLocationSuggest(
  type: LocationSearchType,
  query: string,
  enabled: boolean,
) {
  const [items, setItems] = useState<LocationSuggestItem[]>([]);
  const [status, setStatus] = useState<LocationSuggestStatus>("idle");

  useEffect(() => {
    const trimmed = query.trim();
    if (!enabled || !trimmed) {
      setItems([]);
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await searchLocations({
            type,
            q: trimmed,
            limit: SEARCH_LIMIT,
            signal: controller.signal,
          });

          let mapped: LocationSuggestItem[] = rows.map((row) => ({
            title: row.name,
            city: row.city?.trim() || row.state,
          }));

          if (type === "to_destination") {
            mapped = mapped.filter((item) => !isBengaluruPlace(item.title));
          }

          if (controller.signal.aborted) return;
          setItems(mapped);
          setStatus(mapped.length > 0 ? "ready" : "empty");
        } catch (error) {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          if (
            error instanceof Error &&
            (error.name === "AbortError" || /aborted/i.test(error.message))
          ) {
            return;
          }
          setItems([]);
          setStatus("error");
        }
      })();
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [type, query, enabled]);

  return { items, status };
}

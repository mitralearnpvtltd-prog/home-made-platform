import { useEffect, useState } from "react";
import {
  clearLocationRecents,
  loadLocationRecents,
  rememberLocationRecent,
  type LocationRecentKind,
  type RecentLocationEntry,
} from "./locationRecents";

export function useLocationRecents(kind: LocationRecentKind) {
  const [recents, setRecents] = useState<RecentLocationEntry[]>(() =>
    loadLocationRecents(kind),
  );

  useEffect(() => {
    function sync() {
      setRecents(loadLocationRecents(kind));
    }

    sync();
    window.addEventListener("aahaa-location-recents", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aahaa-location-recents", sync);
      window.removeEventListener("storage", sync);
    };
  }, [kind]);

  function remember(name: string) {
    setRecents(rememberLocationRecent(kind, name));
  }

  function clear() {
    setRecents(clearLocationRecents(kind));
  }

  return { recents, remember, clear };
}

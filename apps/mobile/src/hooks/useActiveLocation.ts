import { useCurrentLocation, type LocationStatus } from "./useLocation";
import { useFavorites } from "../store/favorites";

export type ActiveLocationStatus =
  | LocationStatus
  | {
      kind: "ready";
      lat: number;
      lon: number;
      label: string;
      source: "favorite";
    };

/**
 * Combine GPS resolution with the persisted favorite selection. When the
 * active location is a favorite, GPS is bypassed entirely (no permission
 * prompt, immediate ready state).
 */
export function useActiveLocation(): {
  status: ActiveLocationStatus;
  refresh: () => void;
} {
  const active = useFavorites((s) => s.active);
  const gps = useCurrentLocation();

  if (active.kind === "favorite") {
    return {
      status: {
        kind: "ready",
        lat: active.favorite.lat,
        lon: active.favorite.lon,
        label: active.favorite.name,
        source: "favorite",
      },
      refresh: gps.refresh,
    };
  }
  return gps;
}

import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type LocationStatus =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "denied" }
  | { kind: "error"; message: string }
  | { kind: "ready"; lat: number; lon: number };

export function useCurrentLocation(): {
  status: LocationStatus;
  refresh: () => void;
} {
  const [status, setStatus] = useState<LocationStatus>({ kind: "idle" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "requesting" });
    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (perm.status !== "granted") {
          setStatus({ kind: "denied" });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setStatus({
          kind: "ready",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  return {
    status,
    refresh: () => setNonce((n) => n + 1),
  };
}

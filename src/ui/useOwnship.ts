import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export interface Ownship {
  lat: number;
  lon: number;
  altFt: number; // GPS altitude (MSL-ish), feet
  gsKt: number; // ground speed, knots
  trackDeg: number | null; // true course over ground, degrees (null when stopped)
  at: number; // epoch ms of the fix
}

export interface OwnshipState {
  ownship: Ownship | null;
  permission: "unknown" | "granted" | "denied";
  error: string | null;
}

const MS_TO_KT = 1.943844;
const M_TO_FT = 3.28084;

/** Device GPS at ~1 Hz. In plan mode (no fix / denied) ownship stays null and
 * the map shows no own-ship, which the Fly screen already handles. */
export function useOwnship(active = true): OwnshipState {
  const [state, setState] = useState<OwnshipState>({
    ownship: null, permission: "unknown", error: null,
  });
  const sub = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let alive = true;
    if (!active) return;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!alive) return;
        if (status !== "granted") {
          setState((s) => ({ ...s, permission: "denied" }));
          return;
        }
        setState((s) => ({ ...s, permission: "granted" }));
        sub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
          (pos) => {
            if (!alive) return;
            const c = pos.coords;
            setState((s) => ({
              ...s,
              ownship: {
                lat: c.latitude,
                lon: c.longitude,
                altFt: (c.altitude ?? 0) * M_TO_FT,
                gsKt: (c.speed ?? 0) * MS_TO_KT,
                trackDeg: c.heading != null && c.heading >= 0 ? c.heading : null,
                at: pos.timestamp,
              },
            }));
          },
        );
      } catch (e) {
        if (alive) setState((s) => ({ ...s, error: String(e) }));
      }
    })();
    return () => {
      alive = false;
      sub.current?.remove();
      sub.current = null;
    };
  }, [active]);

  return state;
}

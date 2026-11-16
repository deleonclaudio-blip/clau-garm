import { useEffect, useRef, useState } from "react";
import type { RegionPack } from "../data/pack";
import { UY_DEFAULT_MAGVAR } from "./units";
import type { Ownship } from "./useOwnship";

/** Magnetic variation for the HUD, taken from the nearest aerodrome in the pack
 * (R-Tree), refreshed as the aircraft moves. Falls back to the regional default
 * (-12°) when there is no pack, no fix, or the nearest aerodrome has no mag_var.
 * Signed, west negative, as published in the AIP. */
export function useMagVar(pack: RegionPack | null, ownship: Ownship | null): number {
  const [magVar, setMagVar] = useState(UY_DEFAULT_MAGVAR);
  const last = useRef<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!pack || !ownship) {
      setMagVar(UY_DEFAULT_MAGVAR);
      return;
    }
    const p = last.current;
    const moved = !p
      || Math.abs(ownship.lat - p.lat) > 0.1 // ~11 km; mag var changes slowly
      || Math.abs(ownship.lon - p.lon) > 0.1;
    if (!moved) return;
    last.current = { lat: ownship.lat, lon: ownship.lon };

    let alive = true;
    pack.nearestAerodrome(ownship.lat, ownship.lon)
      .then((ad) => {
        if (alive) setMagVar(ad?.magVar ?? UY_DEFAULT_MAGVAR);
      })
      .catch(() => { if (alive) setMagVar(UY_DEFAULT_MAGVAR); });
    return () => { alive = false; };
  }, [pack, ownship]);

  return magVar;
}

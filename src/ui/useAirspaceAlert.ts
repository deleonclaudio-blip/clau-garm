import { useEffect, useRef, useState } from "react";
import type { AirspaceHit } from "../domain/airspace";
import type { RegionPack } from "../data/pack";
import type { Ownship } from "./useOwnship";

/** Polls getAirspacesAtPosition as the aircraft moves. Throttled so we only
 * query when the position or altitude changes meaningfully (the airspace map
 * does not change between fixes a few metres apart). pack may be null before
 * the region pack is opened — then there is no alert. */
export function useAirspaceAlert(
  pack: RegionPack | null,
  ownship: Ownship | null,
  minMoveDeg = 0.002, // ~200 m
  minAltFt = 200,
): AirspaceHit[] {
  const [hits, setHits] = useState<AirspaceHit[]>([]);
  const last = useRef<{ lat: number; lon: number; alt: number } | null>(null);

  useEffect(() => {
    if (!pack || !ownship) {
      setHits([]);
      return;
    }
    const p = last.current;
    const moved = !p
      || Math.abs(ownship.lat - p.lat) > minMoveDeg
      || Math.abs(ownship.lon - p.lon) > minMoveDeg
      || Math.abs(ownship.altFt - p.alt) > minAltFt;
    if (!moved) return;
    last.current = { lat: ownship.lat, lon: ownship.lon, alt: ownship.altFt };

    let alive = true;
    pack.getAirspacesAtPosition(ownship.lat, ownship.lon, ownship.altFt)
      .then((h) => { if (alive) setHits(h); })
      .catch(() => { if (alive) setHits([]); });
    return () => { alive = false; };
  }, [pack, ownship, minMoveDeg, minAltFt]);

  return hits;
}

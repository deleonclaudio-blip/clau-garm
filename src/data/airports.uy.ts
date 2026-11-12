// Uruguay aerodrome / navaid / waypoint lookup for planning.
// Data comes from the generated module (compiled from the AIP Uruguay pack),
// not hand-typed. The device app will query the SQLite pack directly; this
// in-memory list backs the planning screens and FastFind search.

import type { Airport, Waypoint } from "../domain/types";
import { UY_AIRPORTS, UY_NAVAIDS, UY_WAYPOINTS, AIRAC } from "./uy.generated";

export { AIRAC };
export const UY_SEED_AIRPORTS = UY_AIRPORTS; // kept name for existing imports

const ALL: Waypoint[] = [...UY_AIRPORTS, ...UY_NAVAIDS, ...UY_WAYPOINTS];
const byIdent = new Map(ALL.map((w) => [w.ident, w]));

export function findAirport(ident: string): Airport | undefined {
  const w = byIdent.get(ident.trim().toUpperCase());
  return w && w.type === "airport" ? (w as Airport) : undefined;
}

/** Any fix (airport, navaid, waypoint) by exact identifier. */
export function findWaypoint(ident: string): Waypoint | undefined {
  return byIdent.get(ident.trim().toUpperCase());
}

/** Prefix / name search for the FastFind-style field. Airports first. */
export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return UY_AIRPORTS.filter(
    (a) => a.ident.startsWith(q) || a.name?.toUpperCase().includes(q),
  ).slice(0, limit);
}

/** Broader search including navaids and waypoints, for route entry. */
export function searchFixes(query: string, limit = 10): Waypoint[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const starts = ALL.filter((w) => w.ident.startsWith(q));
  const contains = ALL.filter(
    (w) => !w.ident.startsWith(q) && w.name?.toUpperCase().includes(q),
  );
  return [...starts, ...contains].slice(0, limit);
}

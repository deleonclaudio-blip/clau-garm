// A small hand-made seed of Uruguayan aerodromes for the vertical slice.
// These are PUBLIC FACTS (ICAO ident + approximate coordinates), not Garmin's
// data. The real app loads a licence-clean region pack (openAIP / DINACIA) at
// runtime; this file only exists so the slice has something to draw. Confirm
// every value against the DINACIA AIP before any real use.

import type { Airport } from "../domain/types";

export const UY_SEED_AIRPORTS: Airport[] = [
  { ident: "SUMU", type: "airport", name: "Carrasco / Gen. Cesáreo L. Berisso", lat: -34.838, lon: -56.0308, elevationFt: 105 },
  { ident: "SUAA", type: "airport", name: "Ángel S. Adami", lat: -34.789, lon: -56.2647, elevationFt: 174 },
  { ident: "SUDU", type: "airport", name: "Santa Bernardina (Durazno)", lat: -33.3588, lon: -56.4994, elevationFt: 304 },
  { ident: "SULS", type: "airport", name: "Laguna del Sauce (Punta del Este)", lat: -34.8551, lon: -55.0943, elevationFt: 95 },
  { ident: "SUSO", type: "airport", name: "Nueva Hesperides (Salto)", lat: -31.4385, lon: -57.9853, elevationFt: 187 },
  { ident: "SURV", type: "airport", name: "Rivera", lat: -30.9745, lon: -55.4762, elevationFt: 712 },
  { ident: "SUPU", type: "airport", name: "Paysandú (Tydeo Larre Borges)", lat: -32.3633, lon: -58.0619, elevationFt: 138 },
];

export function findAirport(ident: string): Airport | undefined {
  const up = ident.trim().toUpperCase();
  return UY_SEED_AIRPORTS.find((a) => a.ident === up);
}

/** Prefix search for the FastFind-style waypoint field. */
export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return UY_SEED_AIRPORTS.filter(
    (a) => a.ident.startsWith(q) || a.name?.toUpperCase().includes(q),
  ).slice(0, limit);
}

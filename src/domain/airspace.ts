// Airspace geometry + vertical classification. Pure functions, testable without
// a device. pack.ts pairs these with the SQLite R-Tree pre-filter.
// Planning aid only — never a primary source for airspace separation.

export interface AirspaceLayer {
  airspaceClass: string | null;
  lowerFt: number | null;
  upperFt: number | null;
  schedule: string | null;
}

export interface AirspacePolygon {
  name: string;
  type: string | null;
  /** GeoJSON Polygon coordinates: rings of [lon, lat]. */
  geometry: number[][][];
  layers: AirspaceLayer[];
}

export interface AirspaceHit {
  name: string;
  type: string | null;
  /** The class at the queried altitude, or null if laterally inside but
   * vertically outside every layer. */
  insideClass: string | null;
  /** Classes of layers immediately above / below the queried altitude. */
  above: string[];
  below: string[];
}

/** Ray-casting point-in-polygon. point and ring are [lon, lat]. */
export function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat) {
      const xCross = ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
      if (lon < xCross) inside = !inside;
    }
  }
  return inside;
}

/** True if the point is inside the polygon's outer ring (and outside holes). */
export function pointInPolygon(lon: number, lat: number, polygon: number[][][]): boolean {
  if (polygon.length === 0) return false;
  if (!pointInRing(lon, lat, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(lon, lat, polygon[h])) return false; // inside a hole
  }
  return true;
}

/** Which layer contains altFt, plus the layers above and below it. */
export function classifyAltitude(layers: AirspaceLayer[], altFt: number): {
  insideClass: string | null;
  above: string[];
  below: string[];
} {
  let insideClass: string | null = null;
  const above: string[] = [];
  const below: string[] = [];
  for (const l of layers) {
    if (l.lowerFt == null || l.upperFt == null) continue;
    if (l.lowerFt <= altFt && altFt < l.upperFt) insideClass = l.airspaceClass;
    else if (l.lowerFt > altFt) above.push(l.airspaceClass ?? "");
    else below.push(l.airspaceClass ?? "");
  }
  return { insideClass, above, below };
}

/** Given candidate airspaces (already R-Tree pre-filtered), return the ones the
 * point is laterally inside, with the class at altFt. */
export function airspacesAtPosition(
  candidates: AirspacePolygon[],
  lat: number,
  lon: number,
  altFt: number,
): AirspaceHit[] {
  const hits: AirspaceHit[] = [];
  for (const a of candidates) {
    if (!pointInPolygon(lon, lat, a.geometry)) continue;
    const v = classifyAltitude(a.layers, altFt);
    hits.push({ name: a.name, type: a.type, insideClass: v.insideClass,
      above: v.above, below: v.below });
  }
  return hits;
}

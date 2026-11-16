// Airspace geometry + vertical classification. Pure functions, testable without
// a device. pack.ts pairs these with the SQLite R-Tree pre-filter.
// Planning aid only — never a primary source for airspace separation.

export interface AirspaceLayer {
  airspaceClass: string | null;
  lowerFt: number | null; // converted envelope, used for the vertical filter
  upperFt: number | null;
  // published form, for display (e.g. "600 m", "FL195", "GND")
  lowerVal: number | null;
  lowerUnit: string | null;
  lowerRef: string | null;
  upperVal: number | null;
  upperUnit: string | null;
  upperRef: string | null;
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
  /** The layer the aircraft is in, and the nearest layers above / below, with
   * their vertical limits (for the alert banner). null when none. */
  activeLayer: AirspaceLayer | null;
  layerAbove: AirspaceLayer | null;
  layerBelow: AirspaceLayer | null;
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
  activeLayer: AirspaceLayer | null;
  layerAbove: AirspaceLayer | null;
  layerBelow: AirspaceLayer | null;
  above: string[];
  below: string[];
} {
  let active: AirspaceLayer | null = null;
  const aboveLayers: AirspaceLayer[] = [];
  const belowLayers: AirspaceLayer[] = [];
  for (const l of layers) {
    if (l.lowerFt == null || l.upperFt == null) continue;
    if (l.lowerFt <= altFt && altFt < l.upperFt) active = l;
    else if (l.lowerFt > altFt) aboveLayers.push(l);
    else belowLayers.push(l);
  }
  // nearest above = smallest lowerFt among those above; nearest below = largest upperFt
  aboveLayers.sort((a, b) => (a.lowerFt! - b.lowerFt!));
  belowLayers.sort((a, b) => (b.upperFt! - a.upperFt!));
  return {
    insideClass: active?.airspaceClass ?? null,
    activeLayer: active,
    layerAbove: aboveLayers[0] ?? null,
    layerBelow: belowLayers[0] ?? null,
    above: aboveLayers.map((l) => l.airspaceClass ?? ""),
    below: belowLayers.map((l) => l.airspaceClass ?? ""),
  };
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
      activeLayer: v.activeLayer, layerAbove: v.layerAbove, layerBelow: v.layerBelow,
      above: v.above, below: v.below });
  }
  return hits;
}

// Query service over the on-device region pack (SQLite, compiled by
// data/build_pipeline.py). Uses expo-sqlite. On the device the pack file is
// downloaded/bundled, then opened read-only. These are the same lookups the
// planning screens use, but backed by the real pack instead of the in-memory
// list — swap PACK_SOURCE in one place.
//
// NOTE: not runnable in CI here (needs a device/expo-sqlite); it type-checks.

import type { SQLiteDatabase } from "expo-sqlite";
import type { Airport, Waypoint, WaypointType } from "../domain/types";
import {
  airspacesAtPosition,
  type AirspaceHit,
  type AirspaceLayer,
  type AirspacePolygon,
} from "../domain/airspace";

export type { AirspaceHit } from "../domain/airspace";

function rowToAirport(r: any): Airport {
  return {
    ident: r.icao,
    type: "airport",
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    elevationFt: r.elev_ft ?? undefined,
    runways: undefined,
  };
}

export class RegionPack {
  constructor(private db: SQLiteDatabase) {}

  async airport(ident: string): Promise<Airport | undefined> {
    const r = await this.db.getFirstAsync<any>(
      "SELECT * FROM aerodromes WHERE icao = ?",
      ident.trim().toUpperCase(),
    );
    return r ? rowToAirport(r) : undefined;
  }

  async searchAirports(query: string, limit = 8): Promise<Airport[]> {
    const q = query.trim().toUpperCase();
    if (!q) return [];
    const rows = await this.db.getAllAsync<any>(
      "SELECT * FROM aerodromes WHERE icao LIKE ? OR upper(name) LIKE ? "
        + "ORDER BY icao LIMIT ?",
      `${q}%`, `%${q}%`, limit,
    );
    return rows.map(rowToAirport);
  }

  /** Nearest aerodrome to a point, with its magnetic variation (signed, west
   * negative, as published). Uses the R-Tree: expands a small bbox until it
   * finds candidates, then picks the closest by great-circle distance. Returns
   * null if none nearby (caller falls back to the regional default). */
  async nearestAerodrome(
    lat: number, lon: number,
  ): Promise<{ icao: string; lat: number; lon: number; magVar: number | null } | null> {
    for (const halfDeg of [0.5, 1.5, 3.0]) {
      const rows = await this.db.getAllAsync<any>(
        `SELECT a.icao, a.lat, a.lon, a.mag_var
           FROM spatial_index i
           JOIN spatial_lookup s ON s.rtree_id = i.id
           JOIN aerodromes a ON a.icao = s.entity_id
          WHERE s.entity_type = 'aerodrome'
            AND i.min_lat BETWEEN ? AND ? AND i.min_lon BETWEEN ? AND ?`,
        lat - halfDeg, lat + halfDeg, lon - halfDeg, lon + halfDeg,
      );
      if (rows.length === 0) continue;
      let best = rows[0];
      let bestD = Infinity;
      for (const r of rows) {
        const dLat = r.lat - lat;
        const dLon = (r.lon - lon) * Math.cos((lat * Math.PI) / 180);
        const d = dLat * dLat + dLon * dLon; // squared, monotonic — fine for nearest
        if (d < bestD) { bestD = d; best = r; }
      }
      return { icao: best.icao, lat: best.lat, lon: best.lon, magVar: best.mag_var };
    }
    return null;
  }

  /** Fixes within a bounding box, via the R-Tree spatial index. */
  async near(
    minLat: number, maxLat: number, minLon: number, maxLon: number,
  ): Promise<Waypoint[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT s.entity_type AS kind, s.entity_id AS id, i.min_lat AS lat, i.min_lon AS lon
         FROM spatial_index i
         JOIN spatial_lookup s ON s.rtree_id = i.id
        WHERE i.min_lat >= ? AND i.max_lat <= ? AND i.min_lon >= ? AND i.max_lon <= ?`,
      minLat, maxLat, minLon, maxLon,
    );
    const kindToType: Record<string, WaypointType> = {
      aerodrome: "airport", navaid: "vor", waypoint: "intersection",
    };
    return rows.map((r) => ({
      ident: r.id, type: kindToType[r.kind] ?? "user", lat: r.lat, lon: r.lon,
    }));
  }

  /** 3D query: which airspace and class the aircraft is in at (lat, lon, altFt),
   * and the layers just above/below. R-Tree bbox pre-filter in SQL, then exact
   * point-in-polygon + vertical filter in pure code. */
  async getAirspacesAtPosition(
    lat: number, lon: number, altitudeFt: number,
  ): Promise<AirspaceHit[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT a.id, a.name, a.type, a.geometry_json
         FROM airspace_rtree r JOIN airspaces a ON a.id = r.id
        WHERE ? BETWEEN r.min_lat AND r.max_lat
          AND ? BETWEEN r.min_lon AND r.max_lon`,
      lat, lon,
    );
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const layerRows = await this.db.getAllAsync<any>(
      `SELECT airspace_id, airspace_class, lower_val, lower_unit, lower_ref, lower_ft,
              upper_val, upper_unit, upper_ref, upper_ft, schedule
         FROM airspace_layers WHERE airspace_id IN (${placeholders}) ORDER BY lower_ft`,
      ...ids,
    );
    const byParent = new Map<number, AirspaceLayer[]>();
    for (const l of layerRows) {
      const list = byParent.get(l.airspace_id) ?? [];
      list.push({
        airspaceClass: l.airspace_class,
        lowerFt: l.lower_ft, upperFt: l.upper_ft,
        lowerVal: l.lower_val, lowerUnit: l.lower_unit, lowerRef: l.lower_ref,
        upperVal: l.upper_val, upperUnit: l.upper_unit, upperRef: l.upper_ref,
        schedule: l.schedule,
      });
      byParent.set(l.airspace_id, list);
    }
    const candidates: AirspacePolygon[] = rows.map((r) => ({
      name: r.name, type: r.type,
      geometry: JSON.parse(r.geometry_json),
      layers: byParent.get(r.id) ?? [],
    }));
    return airspacesAtPosition(candidates, lat, lon, altitudeFt);
  }
}

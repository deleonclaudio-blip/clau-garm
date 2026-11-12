// Query service over the on-device region pack (SQLite, compiled by
// data/build_pipeline.py). Uses expo-sqlite. On the device the pack file is
// downloaded/bundled, then opened read-only. These are the same lookups the
// planning screens use, but backed by the real pack instead of the in-memory
// list — swap PACK_SOURCE in one place.
//
// NOTE: not runnable in CI here (needs a device/expo-sqlite); it type-checks.

import type { SQLiteDatabase } from "expo-sqlite";
import type { Airport, Waypoint, WaypointType } from "../domain/types";

export interface AirspaceLimit {
  value: number | null;
  unit: "ft" | "m" | "fl" | null;
  ref: string | null; // gnd | msl | std | raw
}

export interface Airspace {
  name: string;
  type: string | null;
  classRaw: string | null; // verbatim; may describe several layers
  lower: AirspaceLimit;
  upper: AirspaceLimit;
  geom: unknown; // GeoJSON Polygon coordinates
}

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

  /** Airspaces whose bounding box contains the point — caller does the precise
   * point-in-polygon test on geom. Cheap pre-filter for "what's around me". */
  async airspaces(): Promise<Airspace[]> {
    const rows = await this.db.getAllAsync<any>("SELECT * FROM airspaces");
    return rows.map((r) => ({
      name: r.name,
      type: r.type,
      classRaw: r.class_raw,
      lower: { value: r.lower_val, unit: r.lower_unit, ref: r.lower_ref },
      upper: { value: r.upper_val, unit: r.upper_unit, ref: r.upper_ref },
      geom: JSON.parse(r.geom),
    }));
  }
}

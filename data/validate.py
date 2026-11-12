#!/usr/bin/env python3
"""Validate the built Uruguay region pack. Run after build_pipeline.py.
Catches the problems that broke the first build and guards each AIRAC refresh.
Exit 0 all good, 1 on any failure, 2 if the pack is missing.
"""

import json
import math
import sqlite3
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "dist"
R_NM = 3440.065

# Uruguay bounding box, with a small margin for fixes over the Río de la Plata.
LAT_MIN, LAT_MAX = -35.4, -30.0
LON_MIN, LON_MAX = -58.7, -53.0


def dist_nm(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a[1], a[0], b[1], b[0]])
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R_NM * math.asin(min(1, math.sqrt(h)))


def main():
    failures = []
    warnings = []

    data = json.loads((HERE / "aip_uruguay_data.json").read_text(encoding="utf-8"))
    db_path = OUT / "aip_uruguay.sqlite"
    if not db_path.exists():
        print("validate: pack not built. Run build_pipeline.py first.", file=sys.stderr)
        return 2
    conn = sqlite3.connect(db_path)

    # 1. Row counts: JSON vs metadata vs SQLite.
    tables = {"aerodromes": "aerodromes", "runways": "runways", "frequencies": "frequencies",
              "navaids": "navaids", "waypoints": "waypoints", "surface_lights": "surface_lights",
              "airspaces": "airspaces"}
    for key, tbl in tables.items():
        n_json = len(data[key])
        n_db = conn.execute(f"select count(*) from {tbl}").fetchone()[0]
        if n_json != n_db:
            failures.append(f"{key}: JSON has {n_json} but DB has {n_db}")
        mk = f"total_{key}"
        if mk in data["metadata"] and data["metadata"][mk] != n_json:
            failures.append(f"metadata.{mk}={data['metadata'][mk]} but {key} has {n_json}")

    # 2. Coordinates inside Uruguay (+margin).
    def check_coords(rows, idk):
        for r in rows:
            lat, lon = r.get("lat"), r.get("lon")
            if lat is None or lon is None:
                continue
            if not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
                failures.append(f"coord out of Uruguay: {r.get(idk)} ({lat},{lon})")
    check_coords(data["aerodromes"], "icao")
    check_coords(data["navaids"], "ident")
    check_coords(data["waypoints"], "ident")
    check_coords(data["surface_lights"], "name")

    # 3. Referential integrity.
    ad = {a["icao"] for a in data["aerodromes"]}
    for key in ("runways", "frequencies"):
        bad = {r["icao"] for r in data[key] if r["icao"] not in ad}
        if bad:
            failures.append(f"{key} reference missing aerodrome(s): {sorted(bad)}")

    # 4. Cascade delete still works.
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("delete from aerodromes where icao='SUMU'")
    left = conn.execute("select (select count(*) from runways where icao='SUMU')"
                        "+(select count(*) from frequencies where icao='SUMU')").fetchone()[0]
    if left != 0:
        failures.append("cascade delete of SUMU left child rows")
    conn.rollback()

    # 5. Airspace geometry: closed rings, non-zero area, correct coordinate order,
    #    and circles/arcs match their declared radius.
    gj = json.loads((OUT / "airspaces.geojson").read_text(encoding="utf-8"))
    by_name = {a["name"]: a for a in data["airspaces"]}
    for f in gj["features"]:
        name = f["properties"]["name"]
        ring = f["geometry"]["coordinates"][0]
        if ring[0] != ring[-1]:
            failures.append(f"{name}: ring not closed")
        area = abs(sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
                       for i in range(len(ring) - 1))) / 2
        if area <= 0:
            failures.append(f"{name}: zero-area polygon")
        for lon, lat in ring:
            if not (LON_MIN <= lon <= LON_MAX and LAT_MAX >= lat >= -36.5):
                failures.append(f"{name}: vertex out of range ({lon},{lat})")
                break
        src = by_name[name]
        if "radius_nm" in src and "center" in src and src.get("geometry_type") != "polygon_with_arcs":
            cen = src["center"]
            ds = [dist_nm(cen, p) for p in ring[:-1]]
            if max(abs(d - src["radius_nm"]) for d in ds) > 0.1:
                failures.append(f"{name}: generated radius off (declared {src['radius_nm']} nm)")

    # 6. Soft checks (warnings, not failures).
    rwy_ic = {r["icao"] for r in data["runways"]}
    for a in data["aerodromes"]:
        if a["icao"] not in rwy_ic:
            warnings.append(f"{a['icao']} has no runway (minor/mil field)")
        if a["lat"] is None or a["lon"] is None:
            warnings.append(f"{a['icao']} has no coordinates")

    conn.close()

    for w in warnings:
        print(f"WARN  {w}")
    for e in failures:
        print(f"FAIL  {e}")
    print(f"\n{len(failures)} failures, {len(warnings)} warnings")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

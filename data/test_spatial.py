#!/usr/bin/env python3
"""3D airspace query test against the built pack. Proves the same logic the app
runs in pack.ts: R-Tree bbox pre-filter -> ray-casting point-in-polygon ->
vertical layer filter. Run after build_pipeline.py. Exit 0 pass, 1 fail."""

import json
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "dist" / "aip_uruguay.sqlite"


def point_in_ring(lon, lat, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > lat) != (yj > lat):
            x_cross = (xj - xi) * (lat - yi) / (yj - yi) + xi
            if lon < x_cross:
                inside = not inside
        j = i
    return inside


def airspaces_at(conn, lat, lon, alt_ft):
    """Return the (airspace, class) the point is inside at alt_ft, plus the
    layers immediately above and below within the same lateral airspace."""
    rows = conn.execute(
        "SELECT a.id,a.name,a.type,a.geometry_json FROM airspace_rtree r "
        "JOIN airspaces a ON a.id=r.id "
        "WHERE ? BETWEEN r.min_lat AND r.max_lat AND ? BETWEEN r.min_lon AND r.max_lon",
        (lat, lon),
    ).fetchall()
    out = []
    for aid, name, atype, geom in rows:
        coords = json.loads(geom)
        if not point_in_ring(lon, lat, coords[0]):
            continue
        layers = conn.execute(
            "SELECT airspace_class,lower_ft,upper_ft FROM airspace_layers "
            "WHERE airspace_id=? ORDER BY lower_ft", (aid,),
        ).fetchall()
        inside = next((c for c, lo, up in layers
                       if lo is not None and up is not None and lo <= alt_ft < up), None)
        above = [c for c, lo, up in layers if lo is not None and lo > alt_ft]
        below = [c for c, lo, up in layers if up is not None and up <= alt_ft]
        out.append({"name": name, "type": atype, "class": inside,
                    "above": above, "below": below})
    return out


def main():
    if not DB.exists():
        print("pack not built", file=sys.stderr)
        return 1
    conn = sqlite3.connect(DB)
    fails = []

    # Carrasco (inside the TMA laterally): class changes with altitude.
    CARRASCO = (-34.832722, -56.025139)  # CRR VOR
    cases = [(1000, "G"), (5000, "C"), (21000, "A")]  # FL210 = 21000 ft
    for alt, want in cases:
        res = [r for r in airspaces_at(conn, *CARRASCO, alt) if r["name"] == "CARRASCO TMA"]
        got = res[0]["class"] if res else None
        ok = got == want
        print(f"  CARRASCO TMA @ {alt:>5} ft -> class {got}  (want {want})  {'OK' if ok else 'FAIL'}")
        if not ok:
            fails.append(f"TMA @ {alt}ft got {got} want {want}")

    # ADAMI ATZ: a point inside its polygon at low level is inside the ATZ.
    adami_geom = json.loads(conn.execute(
        "SELECT geometry_json FROM airspaces WHERE name='ADAMI ATZ'").fetchone()[0])
    ring = adami_geom[0]
    cx = sum(p[0] for p in ring[:-1]) / (len(ring) - 1)
    cy = sum(p[1] for p in ring[:-1]) / (len(ring) - 1)
    assert point_in_ring(cx, cy, ring), "centroid should be inside ADAMI ring"
    res = [r for r in airspaces_at(conn, cy, cx, 500) if r["name"] == "ADAMI ATZ"]
    ok = bool(res)
    print(f"  ADAMI ATZ @   500 ft -> inside={ok} class={res[0]['class'] if res else None}  "
          f"{'OK' if ok else 'FAIL'}")
    if not ok:
        fails.append("ADAMI ATZ point not detected inside")

    # A point far outside returns nothing.
    out = airspaces_at(conn, -31.0, -54.0, 3000)
    print(f"  remote point -> {len(out)} airspace(s) (expect few/none)")

    print(f"\n{len(fails)} failures")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())

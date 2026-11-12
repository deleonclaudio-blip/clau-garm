#!/usr/bin/env python3
"""ETL for the clau-garm Uruguay region pack.

Reads data/aip_uruguay_data.json (structured AIP Uruguay) and writes:
  - dist/aip_uruguay.sqlite   device database (tables + R-Tree spatial index)
  - dist/airspaces.geojson    airspace polygons (built from circles/arcs/vertices)
  - dist/runways.geojson      runway centrelines
  - dist/points_nav.geojson   aerodromes + navaids + waypoints

Pure standard library. Run:  python3 data/build_pipeline.py
Validate:                     python3 data/validate.py
"""

import json
import math
import re
import sqlite3
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "dist"
R_NM = 3440.065  # earth radius in nautical miles


def destination_point(lat_deg, lon_deg, bearing_deg, distance_nm):
    lat1, lon1, brng = map(math.radians, [lat_deg, lon_deg, bearing_deg])
    d = distance_nm / R_NM
    lat2 = math.asin(math.sin(lat1) * math.cos(d) + math.cos(lat1) * math.sin(d) * math.cos(brng))
    lon2 = lon1 + math.atan2(
        math.sin(brng) * math.sin(d) * math.cos(lat1),
        math.cos(d) - math.sin(lat1) * math.sin(lat2),
    )
    return [round(math.degrees(lon2), 6), round(math.degrees(lat2), 6)]


def bearing_between(lat1_deg, lon1_deg, lat2_deg, lon2_deg):
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1_deg, lon1_deg, lat2_deg, lon2_deg])
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def build_airspace_polygon(item, steps=72):
    if item.get("geometry_type") == "polygon_with_arcs":
        coords = list(item["vertices"])
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        return [coords]

    c_lon, c_lat = item["center"]
    r_nm = item["radius_nm"]

    if "arc_from" in item and "arc_to" in item:
        start_brg = bearing_between(c_lat, c_lon, item["arc_from"][1], item["arc_from"][0])
        end_brg = bearing_between(c_lat, c_lon, item["arc_to"][1], item["arc_to"][0])
        sweep = (end_brg - start_brg) % 360
        arc_steps = max(12, int(steps * (sweep / 360.0)))
        ring = []
        for i in range(arc_steps + 1):
            b = (start_brg + (sweep * i / arc_steps)) % 360
            ring.append(destination_point(c_lat, c_lon, b, r_nm))
        ring.append(ring[0])
        return [ring]

    ring = [destination_point(c_lat, c_lon, (360.0 * i / steps), r_nm) for i in range(steps)]
    ring.append(ring[0])
    return [ring]


M_TO_FT = 3.28084


def parse_limit(text):
    """'GND'/'SFC' -> (0,'ft','gnd',0); 'FL 055' -> (55,'fl','std',5500);
    '600 M' -> (600,'m','msl',1968.5); '1500 FT' -> (1500,'ft','msl',1500).
    Returns (value, unit, ref, ft). ft is the converted envelope value used for
    the vertical filter. Metric/feet default ref 'msl' (AIP altitudes are AMSL
    unless stated); verify height-referenced limits against the chart."""
    t = (text or "").strip().upper()
    if t in ("GND", "SFC", ""):
        return (0.0, "ft", "gnd", 0.0)
    m = re.match(r"FL\s*0*(\d+)", t)
    if m:
        v = float(m.group(1))
        return (v, "fl", "std", v * 100.0)
    m = re.match(r"([\d.]+)\s*M\b", t)
    if m:
        v = float(m.group(1))
        return (v, "m", "msl", round(v * M_TO_FT, 1))
    m = re.match(r"([\d.]+)\s*FT\b", t)
    if m:
        v = float(m.group(1))
        return (v, "ft", "msl", v)
    return (None, None, t.lower(), None)  # unknown: keep the raw text in ref


def layers_of(a):
    """Explicit layers if present, else a single layer from class/lower/upper."""
    if a.get("layers"):
        return a["layers"]
    return [{"class": a.get("class"), "lower": a.get("lower"), "upper": a.get("upper"),
             "schedule": a.get("schedule")}]


def bbox_of(coords):
    lons = [p[0] for ring in coords for p in ring]
    lats = [p[1] for ring in coords for p in ring]
    return min(lats), max(lats), min(lons), max(lons)


def main():
    data = json.loads((HERE / "aip_uruguay_data.json").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    db = OUT / "aip_uruguay.sqlite"
    if db.exists():
        db.unlink()
    conn = sqlite3.connect(db)
    conn.executescript((HERE / "schema.sql").read_text(encoding="utf-8"))

    for ad in data["aerodromes"]:
        conn.execute(
            "INSERT OR REPLACE INTO aerodromes VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (ad["icao"], ad["name"], ad["category"], ad["lat"], ad["lon"], ad["elev_m"],
             ad["elev_ft"], ad["mag_var"], ad["traffic"], ad["operator"], ad["hours"],
             int(ad["certified_lar139"])),
        )
    for rwy in data["runways"]:
        conn.execute(
            "INSERT INTO runways (icao,rwy,length_m,width_m,surface,pcn,tora_m,lda_m,"
            "thr1_lat,thr1_lon,thr2_lat,thr2_lon) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (rwy["icao"], rwy["rwy"], rwy["length_m"], rwy["width_m"], rwy["surface"],
             rwy["pcn"], rwy["tora_m"], rwy["lda_m"], rwy["thr1_lat"], rwy["thr1_lon"],
             rwy["thr2_lat"], rwy["thr2_lon"]),
        )
    for f in data["frequencies"]:
        conn.execute(
            "INSERT INTO frequencies (icao,service,callsign,freq_mhz,secondary_mhz) "
            "VALUES (?,?,?,?,?)",
            (f["icao"], f["service"], f["callsign"], f["freq_mhz"], f["secondary_mhz"]),
        )
    for n in data["navaids"]:
        conn.execute(
            "INSERT OR REPLACE INTO navaids VALUES (?,?,?,?,?,?,?,?)",
            (n["ident"], n["name"], n["type"], n["freq"], n["ch"], n["lat"], n["lon"],
             n["elev_m"]),
        )
    for w in data["waypoints"]:
        conn.execute("INSERT OR REPLACE INTO waypoints VALUES (?,?,?,?)",
                     (w["ident"], w["lat"], w["lon"], w["route"]))
    for s in data["surface_lights"]:
        conn.execute(
            "INSERT INTO surface_lights (name,type,lat,lon,intensity,characteristics,hours)"
            " VALUES (?,?,?,?,?,?,?)",
            (s["name"], s["type"], s["lat"], s["lon"], s["intensity"], s["characteristics"],
             s["hours"]),
        )

    # Airspaces: parent polygon + R-Tree bbox + one row per vertical layer.
    airspace_features = []
    for a in data["airspaces"]:
        coords = build_airspace_polygon(a)
        min_lat, max_lat, min_lon, max_lon = bbox_of(coords)
        cur = conn.execute(
            "INSERT INTO airspaces (name,type,min_lat,max_lat,min_lon,max_lon,geometry_json)"
            " VALUES (?,?,?,?,?,?,?)",
            (a["name"], a.get("type"), min_lat, max_lat, min_lon, max_lon, json.dumps(coords)),
        )
        aid = cur.lastrowid
        conn.execute(
            "INSERT INTO airspace_rtree (id,min_lat,max_lat,min_lon,max_lon) VALUES (?,?,?,?,?)",
            (aid, min_lat, max_lat, min_lon, max_lon),
        )
        for lyr in layers_of(a):
            lv, lu, lr, lft = parse_limit(lyr.get("lower"))
            uv, uu, ur, uft = parse_limit(lyr.get("upper"))
            conn.execute(
                "INSERT INTO airspace_layers (airspace_id,airspace_class,"
                "lower_val,lower_unit,lower_ref,lower_ft,"
                "upper_val,upper_unit,upper_ref,upper_ft,schedule) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (aid, lyr.get("class"), lv, lu, lr, lft, uv, uu, ur, uft, lyr.get("schedule")),
            )
        props = {k: v for k, v in a.items()
                 if k not in ("center", "radius_nm", "vertices", "geometry_type",
                              "arc_from", "arc_to", "layers")}
        airspace_features.append({
            "type": "Feature", "properties": props,
            "geometry": {"type": "Polygon", "coordinates": coords},
        })

    conn.commit()
    conn.execute("ANALYZE")
    conn.execute("VACUUM")
    conn.close()

    runway_features = [
        {"type": "Feature",
         "properties": {"icao": r["icao"], "rwy": r["rwy"], "surface": r["surface"],
                        "length_m": r["length_m"], "width_m": r["width_m"]},
         "geometry": {"type": "LineString",
                      "coordinates": [[r["thr1_lon"], r["thr1_lat"]],
                                      [r["thr2_lon"], r["thr2_lat"]]]}}
        for r in data["runways"]
    ]
    point_features = (
        [{"type": "Feature",
          "properties": {"layer_type": "aerodrome", "ident": a["icao"], "name": a["name"],
                         "category": a["category"], "elev_ft": a["elev_ft"]},
          "geometry": {"type": "Point", "coordinates": [a["lon"], a["lat"]]}}
         for a in data["aerodromes"]]
        + [{"type": "Feature",
            "properties": {"layer_type": "navaid", "ident": n["ident"], "name": n["name"],
                           "freq": n["freq"]},
            "geometry": {"type": "Point", "coordinates": [n["lon"], n["lat"]]}}
           for n in data["navaids"]]
        + [{"type": "Feature",
            "properties": {"layer_type": "waypoint", "ident": w["ident"], "route": w["route"]},
            "geometry": {"type": "Point", "coordinates": [w["lon"], w["lat"]]}}
           for w in data["waypoints"]]
    )

    for fname, feats in (("airspaces.geojson", airspace_features),
                         ("runways.geojson", runway_features),
                         ("points_nav.geojson", point_features)):
        (OUT / fname).write_text(
            json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False),
            encoding="utf-8")

    print(f"Built {db.name}, airspaces.geojson, runways.geojson, points_nav.geojson in {OUT}/")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Generate src/data/uy.generated.ts from data/aip_uruguay_data.json.
Run from the project root (the Makefile's `app` target does this)."""
import json, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
d = json.loads((HERE / "aip_uruguay_data.json").read_text(encoding="utf-8"))
def esc(s): return (s or "").replace("\\", "\\\\").replace('"', '\\"')
out = ["// GENERATED from data/aip_uruguay_data.json. Do not hand-edit.",
       "// Source: AIP Uruguay (DINACIA). Licence pending — see replica/data-licensing.md.",
       'import type { Airport, Waypoint } from "../domain/types";', "",
       f"export const AIRAC = {json.dumps(d['metadata'].get('airac_cycle'))};", "",
       "export const UY_AIRPORTS: Airport[] = ["]
for a in sorted(d["aerodromes"], key=lambda x: x["icao"]):
    elev = f', elevationFt: {a["elev_ft"]}' if a["elev_ft"] is not None else ""
    out.append(f'  {{ ident: "{a["icao"]}", type: "airport", name: "{esc(a["name"])}", '
               f'lat: {a["lat"]}, lon: {a["lon"]}{elev} }},')
out += ["];", "", "export const UY_NAVAIDS: Waypoint[] = ["]
for n in d["navaids"]:
    t = "vor" if "VOR" in n["type"] else ("ndb" if "NDB" in n["type"] else "user")
    out.append(f'  {{ ident: "{n["ident"]}", type: "{t}", name: "{esc(n["name"])}", '
               f'lat: {n["lat"]}, lon: {n["lon"]} }},')
out += ["];", "", "export const UY_WAYPOINTS: Waypoint[] = ["]
for w in sorted(d["waypoints"], key=lambda x: x["ident"]):
    out.append(f'  {{ ident: "{w["ident"]}", type: "intersection", lat: {w["lat"]}, lon: {w["lon"]} }},')
out += ["];"]
(HERE.parent / "src/data/uy.generated.ts").write_text("\n".join(out) + "\n", encoding="utf-8")
print("wrote src/data/uy.generated.ts")

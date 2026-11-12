# Uruguay region pack — data pipeline

Compiles the structured AIP Uruguay data into the device pack and the app's
data module.

```
data/aip_uruguay_data.json   source (24 aerodromes, 23 runways, 18 freqs,
                             4 navaids, 106 waypoints, 15 lights, 21 airspaces)
data/schema.sql              SQLite schema (+ R-Tree, + airspace table)
data/build_pipeline.py       ETL -> dist/aip_uruguay.sqlite + 3 GeoJSON
data/validate.py             checks counts, coords, geometry, cascade
data/gen_app_data.py         JSON -> src/data/uy.generated.ts
data/maplibre-style.json     overlay style for the aeronautical layers
data/Makefile                `make` = build + validate + regenerate app data
```

Run: `cd data && make`. Output goes to `dist/` (git-ignored).

## Source and licence

The data derives from **DINACIA's AIP Uruguay**. It is theirs. Using it in a
**commercial** product depends on DINACIA's permission — still pending (see
`../replica/data-licensing.md`). For development and for a personal /
non-commercial build it is usable now.

## Known data caveats (verify against the current AIP/charts)

- One light ("Carrasco Edificio Terminal") had `lon -50.03`, an obvious digit
  typo; corrected to `-56.03` and flagged. Re-check its exact position.
- 7 minor/military/private fields have no coordinates or runways (expected).
- Airspace **layered classes** (e.g. Carrasco TMA G/C/A by altitude) are kept
  verbatim in `class_raw`; the structured `lower/upper` columns hold the overall
  envelope only. A per-layer model is future work.
- Arc-based airspaces (e.g. Adami ATZ) are generated as a circular segment.
  Confirm the real shape against the chart.

## What you still need to add (not code)

1. **A basemap.** `maplibre-style.json` draws only the aeronautical overlay; it
   has no background. Choose a tile provider and add a source:
   - MapTiler / Stadia / Mapbox — polished, needs an API key and has a cost.
   - OpenStreetMap raster or Protomaps (PMTiles) — free, self-hosted, more setup.
   This is the main open decision for the map to look like anything.
2. **An Android device or emulator** to run `expo run:android`, see the map and
   capture screenshots. Cannot be done in CI.
3. **Glyphs/sprites** for the MapLibre labels/icons (the `glyphs` and `sprite`
   entries point to placeholders). A sprite generator for ICAO symbols is TODO.
4. **Weather source** (METAR/TAF) for the briefing — a separate decision.
5. **Commercial licence** from DINACIA (and/or openAIP) before selling.

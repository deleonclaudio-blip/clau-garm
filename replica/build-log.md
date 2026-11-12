# Build log — clau-garm

## 2026-11-11 · Shell + vertical slice

Scaffolded an Expo (React Native) + TypeScript app. The whole app type-checks
under `strict` (`npm run typecheck`, exit 0). The domain core is unit-tested
with real Uruguayan aerodrome coordinates.

**Shell** — `App.tsx`: Plan / File / Fly / Log tab bar, dark cockpit theme
wired from the design tokens, 48dp+ touch targets. File and Log are stubs.

**Vertical slice** (the hard part first, per the architecture): enter a
departure and destination → build a plan → see the route drawn → open Fly and
read the navlog.

| piece | file | state |
| --- | --- | --- |
| Domain types | `src/domain/types.ts` | done; SI units, UTC |
| Great-circle geo | `src/domain/geo.ts` | done, tested (SUMU→SUAA 11.9 nm, brg 284) |
| Navlog (ETE/ETA/fuel) | `src/domain/navlog.ts` | done, tested; **no wind yet** |
| Seed UY airports | `src/data/airports.uy.ts` | done; public idents/coords, 7 fields, placeholder for the real pack |
| Fake data layer | `src/data/store.ts` | done; same signatures the Supabase/SQLite layer will implement |
| Button, WaypointField | `src/ui/` | done; tokens only, a11y roles, FastFind-style predictive search |
| RouteView | `src/ui/RouteView.tsx` | **schematic SVG**, the v1 stand-in for the MapLibre moving map |
| Plan / Fly screens | `src/screens/` | done for the slice |

### Features touched (features.csv)

- FT01 enter dep/dest → **partial** (seed airports only)
- FT03 draw route → **partial** (schematic, not the real map)
- FT04 own-ship → **partial** (wiring only; needs device GPS + map)
- FT05 pan/zoom → **no** (needs the real map)
- FT08 navlog → **partial** (computed and tested; no wind)

### Bigger than it looked / honest gaps

- **The moving map is the project.** I built a schematic route view so the data
  flow is real and testable, but the actual MapLibre GL Native map with offline
  vector tiles, own-ship at 1 Hz GPS, airspace and airports is the main
  unbuilt piece. It needs a device and a data pack; it cannot be built or seen
  in this environment.
- **No screenshots.** This step's screenshot/diff requirement (Playwright,
  1440x900) is web-only; a React Native app needs an emulator or device, which
  this environment does not have. `replica/clone-screens/` stays empty until the
  app runs on a device.
- **Everything still runs on seed data and the fake layer.** No Supabase, no
  SQLite, no real aeronautical data — and the data licence (DINACIA/openAIP) is
  still unresolved, which gates FT06 and the whole map.

### Next

`/replica-backend` to replace the fake data layer (Supabase + on-device SQLite,
the pack pipeline), but only once the data-licence question is answered — it
decides what the backend can legally serve.

## 2026-11-12 · Real Uruguay data pack

Integrated a structured AIP Uruguay dataset (user-supplied) as the real data
pipeline, replacing the 7-airport seed.

**Fixed two bugs in the supplied pipeline** (it did not run as given):
- an IndentationError on the GeoJSON-writing loop;
- `conn.execute("ANALYZE; VACUUM;")` — SQLite runs one statement per call, so
  it crashed before writing any GeoJSON.

**Fixed data:** a light's longitude (-50.03 → -56.03, a digit typo) and the
stale waypoint count in metadata (91 → 106, actual).

**Added:** an `airspaces` SQL table with structured limits (value+unit+ref) and
the verbatim class string, so airspace is queryable, not only in GeoJSON; a
`validate.py` (counts, coords, referential integrity, cascade, airspace
geometry and radii — 0 failures); a MapLibre overlay style; an AIRAC Makefile;
a reproducible `gen_app_data.py`; and `src/data/pack.ts`, the device SQLite
query service (type-checks; needs a device to run).

The app now plans against all 24 aerodromes + navaids + waypoints. Whole app
type-checks; domain tests pass against the real data (SUMU→SUAA→SUDU 98.7 nm).

**Still fake:** the in-app data layer (Supabase/SQLite swap pending), and the
map is still the schematic — the real MapLibre map needs a basemap source and a
device. See data/README.md "What you still need to add".

## 2026-11-12 · 3D airspace model

Resolved the three airspace design gaps.

- **Relational model + vertical strata.** `airspaces` (polygon + bbox) with a
  child `airspace_layers` (class, lower/upper as val+unit+ref plus a converted
  `_ft`, schedule), and an `airspace_rtree` spatial index. CARRASCO TMA split
  into its real strata: G (GND–600 M), C (600 M–FL195), A (FL195–FL245).
- **Arc geometry** for arc_from/arc_to airspaces (ADAMI ATZ) kept as the 8 NM
  outer arc closed by the chord — matching the CTR Carrasco cut-out.
- **`getAirspacesAtPosition(lat, lon, altFt)`** in pack.ts: R-Tree bbox
  pre-filter → ray-casting point-in-polygon (`src/domain/airspace.ts`, pure and
  tested) → vertical layer filter, returning the class inside and the layers
  above/below.

Tests (all pass): `data/test_spatial.py` against the real SQLite and a TS unit
test against the GeoJSON both confirm CARRASCO TMA → G/C/A at 1000/5000/21000 ft
and ADAMI ATZ inside at 500 ft. `validate.py` extended (rtree mirrors airspaces,
every airspace has a layer, TMA has 3, bbox contains geometry) — 0 failures.
`make` now runs build + validate + spatial test. Whole app type-checks.

Map base decided: Protomaps / OSM (PMTiles, offline) — MapLibre component next.

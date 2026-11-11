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

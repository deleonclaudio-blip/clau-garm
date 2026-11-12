# Architecture: clau-garm (a VFR rebuild of Garmin Pilot's core)

This is **offline-first mobile**, not a web CRUD app, so most of the pack's
default stack does not apply and is swapped below with reasons. The app must
plan, draw a moving map and show aeronautical data **with no internet, in
flight**. That one requirement drives every choice: the real database at the
moment that matters is the one **on the device**; the cloud is for accounts,
sync, billing and compiling the regional data packs the device downloads.

Before any of this is worth building, the open question from the recon stands:
**the data licence** (DINACIA, openAIP, NOAA). The architecture assumes a
licence-clean pipeline; if that answer is no, the product changes shape.

## Stack

| layer | choice | why |
| --- | --- | --- |
| mobile app | Expo (React Native) + TypeScript | the recon is an Android tablet EFB; one codebase, and iOS later without a rewrite |
| map | MapLibre GL Native (`@maplibre/maplibre-react-native`) with offline vector tiles (PMTiles/MBTiles) | an offline moving map with custom aeronautical layers; open, no per-map-load fee, renders our own data |
| on-device DB | SQLite (`op-sqlite` or expo-sqlite) + the downloaded region packs | the in-flight source of truth; everything the pilot needs must be local |
| device GPS | `expo-location` (device), with a hook for external Bluetooth GPS later | own-ship position; the one hardware dependency the slice keeps |
| styling | the tokens replica-design writes next, via a RN theme | shared design system; no Tailwind on native |
| web app | **none for v1** | an EFB is used in the cockpit; a web planning companion is a later could-have, not the product |
| cloud DB | Postgres on Supabase | accounts, synced flight data, the catalog of data packs; managed and cheap at zero users |
| ORM | Drizzle (cloud) + hand-written SQLite for the packs | Drizzle is the source of truth for the cloud schema; the device/pack schema is its own SQLite DDL (below) |
| auth | Supabase Auth | email + OAuth; works with the Supabase DB |
| payments | Stripe (Checkout + Billing) via a thin backend | yearly EFB subscription, like Garmin's regional plan; RevenueCat is the alternative if we sell through the Play Store's billing |
| data pipeline + API | a small backend (Supabase Edge Functions or a Fly worker) | ingests openAIP/DINACIA/NOAA, compiles region packs, serves downloads, proxies weather |
| jobs | Inngest (or a scheduled Fly worker) | AIRAC-cycle pack builds, weather cache refresh |
| files (data packs) | Supabase Storage (or Cloudflare R2) | the compiled SQLite/PMTiles region packs the device downloads |
| hosting (backend) | Fly or Vercel functions | close to the data pipeline |

One cloud database. One device database per install. No microservices. The
clone does not need Garmin's architecture, it needs its VFR features.

## Schema

Two stores, each with its own source of truth:

1. **Cloud (Postgres/Supabase)** — accounts, the pilot's owned and synced data,
   and the catalog of downloadable packs. Source of truth: the **Drizzle schema**
   in the backend repo; `replica/schema.sql` below is a generated copy for
   reading, never hand-edited. `updated_at` is set by a trigger (shown once).
2. **Device (SQLite)** — a mirror of the pilot's own rows for offline use, plus
   the **read-only region packs** (airports, airspace, navaids) downloaded as
   files. Its DDL lives in the app repo. Weather is fetched live and cached in a
   table with a TTL; it is never authoritative.

Reference aeronautical data (airports, airspace, navaids) is **not per-user**:
the pipeline ingests it, compiles a pack per region + AIRAC cycle, and the
device downloads it. It is never written from the app.

Access rules: the mobile app talks to Supabase directly, so **row-level
security is mandatory** on every owned table — it is the only thing between one
pilot and another's flight plans. The pipeline writes reference tables with the
service role (which bypasses RLS), so those get an explicit "authenticated can
read, only service role can write" policy.

### Cloud schema (generated from Drizzle — do not hand-edit)

```sql
-- updated_at trigger, applied to every table that has the column
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- Pilot profile (1:1 with an auth user). Personal minimums live here as jsonb.
create table pilots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '',
  phone text,
  address text,
  how_you_fly text not null default 'VFR' check (how_you_fly in ('VFR','VFR/IFR')),
  personal_minimums jsonb not null default '{}',   -- {vfr:{...}, ifr:{...}, wind:{...}}
  typical_radius_nm integer,
  units jsonb not null default '{}',               -- display units; data stored SI
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table aircraft (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tail_number text not null,
  type text,
  -- performance, SI units (m/s, kg, litres); display converts
  cruise_tas_ms numeric,
  fuel_burn_lph numeric,
  fuel_capacity_l numeric,
  climb_fpm numeric,
  descent_fpm numeric,
  glide_ratio numeric,
  best_glide_kt numeric,
  weight_balance jsonb not null default '{}',       -- stations, arms, envelope
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aircraft_tail_unique unique (user_id, tail_number)
);
create index on aircraft (user_id);

create table flight_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aircraft_id uuid references aircraft(id) on delete set null,
  name text,
  departure_ident text not null,
  destination_ident text not null,
  cruise_altitude_ft integer,
  cruise_tas_ms numeric,
  departure_time timestamptz,                       -- UTC, always
  status text not null default 'planned'
    check (status in ('planned','filed','active','flown')),
  fuel_plan jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on flight_plans (user_id, updated_at desc);
create index on flight_plans (aircraft_id);

-- Ordered route legs. seq is 0-based; unique per plan so order is a data rule.
create table flight_plan_waypoints (
  id uuid primary key default gen_random_uuid(),
  flight_plan_id uuid not null references flight_plans(id) on delete cascade,
  seq integer not null,
  ident text not null,
  wpt_type text not null default 'airport'
    check (wpt_type in ('airport','vor','ndb','intersection','vrp','user')),
  lat double precision not null,
  lon double precision not null,
  name text,
  constraint fpw_seq_unique unique (flight_plan_id, seq)
);
create index on flight_plan_waypoints (flight_plan_id, seq);

-- Pilot's own saved waypoints (reusable across plans).
create table user_waypoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ident text not null,
  lat double precision not null,
  lon double precision not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_wpt_ident_unique unique (user_id, ident)
);

create table logbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  aircraft_id uuid references aircraft(id) on delete set null,
  flight_date date not null,
  from_ident text,
  to_ident text,
  total_time_min integer,
  details jsonb not null default '{}',              -- endorsements, remarks
  track_ref text,                                   -- Storage key for the GPS track
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on logbook_entries (user_id, flight_date desc);

-- Subscription mirror, updated by Stripe webhooks, read by the app.
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,                                        -- 'uy', 'region', ...
  status text not null default 'none'
    check (status in ('none','trialing','active','past_due','canceled')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Catalog of downloadable region packs (reference data, not owned by a user).
create table data_regions (
  id text primary key,                              -- 'uy', 'sa-south'
  name text not null,
  bbox jsonb not null,                              -- [minlon,minlat,maxlon,maxlat]
  created_at timestamptz not null default now()
);

create table data_pack_versions (
  id uuid primary key default gen_random_uuid(),
  region_id text not null references data_regions(id) on delete cascade,
  airac_cycle text not null,                        -- '2611'
  effective_at timestamptz not null,
  size_bytes bigint not null,
  storage_key text not null,                        -- Storage path to the .pmtiles/.sqlite
  checksum text not null,
  sources jsonb not null default '[]',              -- attribution: openAIP, DINACIA, NOAA
  created_at timestamptz not null default now(),
  constraint pack_region_cycle_unique unique (region_id, airac_cycle)
);
create index on data_pack_versions (region_id, effective_at desc);
```

RLS, in words (policies omitted for length): every table with `user_id` —
`using (auth.uid() = user_id)` for select/insert/update/delete.
`flight_plan_waypoints` — joined through its plan's `user_id`. `data_regions`
and `data_pack_versions` — authenticated may read, only the service role writes.
`subscriptions` — the user may read their row, only the service role writes it.

### Device schema (SQLite, in the app repo — sketch)

The device mirrors the owned tables above (same columns, SQLite types, plus a
`dirty` flag and `synced_at` for the sync engine). On top of that, each
downloaded pack is a read-only attached DB:

```sql
-- region pack (read-only, compiled by the pipeline, attached at runtime)
CREATE TABLE airports (ident TEXT PRIMARY KEY, name TEXT, lat REAL, lon REAL,
  elevation_ft INTEGER, runways TEXT, frequencies TEXT, fuel TEXT);
-- Airspace is a parent polygon + layers (classes stacked by altitude). See the
-- built schema in data/schema.sql; the 3D query lives in src/data/pack.ts
-- (R-Tree bbox -> ray-casting point-in-polygon -> vertical layer filter).
CREATE TABLE airspaces (id INTEGER PRIMARY KEY, name TEXT, type TEXT,
  min_lat REAL, max_lat REAL, min_lon REAL, max_lon REAL,   -- bbox for airspace_rtree
  geometry_json TEXT);
CREATE TABLE airspace_layers (id INTEGER PRIMARY KEY, airspace_id INTEGER,
  airspace_class TEXT,
  -- limits as value + unit + reference (Uruguay mixes FL, feet and METRES),
  -- plus *_ft, the converted envelope used for the vertical filter.
  lower_val REAL, lower_unit TEXT, lower_ref TEXT, lower_ft REAL,
  upper_val REAL, upper_unit TEXT, upper_ref TEXT, upper_ft REAL, schedule TEXT);
CREATE VIRTUAL TABLE airspace_rtree USING rtree(id, min_lat, max_lat, min_lon, max_lon);
CREATE TABLE navaids (ident TEXT PRIMARY KEY, type TEXT, lat REAL, lon REAL, freq TEXT);
-- live weather cache (written by the app, TTL, never authoritative)
CREATE TABLE wx_cache (station TEXT, product TEXT, issued_at TEXT, raw TEXT,
  fetched_at TEXT, PRIMARY KEY (station, product));
```

### Hard constraints the recon implies

- **Route order is a data rule**, not UI: `unique (flight_plan_id, seq)`.
- **One tail number per pilot**: `unique (user_id, tail_number)`.
- **One pack per region + AIRAC cycle**: `unique (region_id, airac_cycle)`.
- **All times UTC** (aviation is Zulu); the DB only ever stores `timestamptz`.
- **All measurements stored SI**, converted at display — see parts that bite.

## API

The backend is small: accounts and sync go straight to Supabase (RLS enforced);
a few server routes handle packs, weather and billing. `<who>` is the caller.

| flow | method path | does | who | input | output |
| --- | --- | --- | --- | --- | --- |
| F01/F02 | (Supabase) flight_plans, _waypoints CRUD | plan data, synced | owner (RLS) | rows | rows |
| F05 | (Supabase) pilots, aircraft CRUD | profile + performance | owner (RLS) | rows | rows |
| F06 | GET /packs?region= | list pack versions for a region | authenticated | region id | versions + signed download URLs |
| F06 | GET /packs/:id/download | signed URL to the pack file | subscriber | pack id | redirect to Storage |
| F03 | GET /wx?stations=&products= | proxy + cache NOAA/DINACIA weather | authenticated | stations, products | METAR/TAF/… JSON |
| F04 | (device) airport lookup | read from the local pack | — | ident | airport row |
| billing | POST /billing/checkout | start a Stripe Checkout session | authenticated | plan | checkout URL |
| billing | GET /billing/portal | Stripe customer portal | subscriber | — | portal URL |

Webhooks in: **Stripe** (`checkout.session.completed`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
`invoice.payment_failed`) → write `subscriptions`; verify signature, store event
id, idempotent.
Jobs: **AIRAC pack build** every cycle (ingest openAIP/DINACIA → compile
PMTiles + SQLite → upload → insert `data_pack_versions`); **weather cache
refresh**. Test-only routes (`E2E=1`): `POST /api/test/reset`,
`GET /api/test/flight-plans?user=`.

Only official, public data sources with our own keys/attribution. Never
Garmin's private endpoints or databases.

## The parts that bite

- **Offline-first is the whole app.** Every must-have has to work with the
  network off. Sync is last-write-wins per row with a `dirty` flag; conflicts
  are rare (one pilot, their own data) but must not lose a flight plan.
- **UTC and time zones.** Aviation runs in Zulu; Uruguay is UTC−3 and has used
  DST in the past. Store UTC, display both Zulu and local, never a naive local
  time.
- **Units.** Store SI; display feet, knots, nm, °C, hPa/inHg, litres/USg per
  the pilot's setting. A unit bug in an EFB is a safety bug. **Airspace limits
  are not uniform**: Uruguay publishes some in metres (e.g. "600 m MSL"),
  others as flight levels or feet, so limits are stored as value + unit +
  reference, never coerced to one unit on ingest. (Confirmed against openAIP's
  Carrasco TMA/CTR/ATZ, which has structured coverage for Uruguay.)
- **Data currency.** Packs carry an AIRAC cycle and effective date; the app
  must warn on an expired pack (Garmin's own repeated warning). Weather cache
  shows its age and is never treated as current.
- **Map performance.** Rendering airspace + airports + route + own-ship at 1 Hz
  GPS on a tablet: vector tiles, simplified geometry per zoom, and keep the own-
  ship layer cheap.
- **GPS.** Device GPS only for v1; design a clean source interface so an
  external Bluetooth receiver drops in later.
- **Storage limits.** Region packs are tens to hundreds of MB; show size before
  download, allow delete, handle "storage full".
- **Safety and liability.** This is the biggest non-code risk: an EFB shows
  data pilots act on. Disclaimers, "not for primary navigation", expired-data
  warnings, and a lawyer's review are not optional.
- **GDPR / data deletion.** Account deletion must remove owned rows (cascade is
  set) and the Storage tracks; add a deletion job.

## Build order

| milestone | features (FT) | screens (S) | tables | routes |
| --- | --- | --- | --- | --- |
| 1. Vertical slice | FT01 FT03 FT04 FT05 | S03 S05 S06 | flight_plans, flight_plan_waypoints, one hand-made UY pack | Supabase CRUD |
| 2. Must-haves | FT02 FT06 FT07 FT08 FT09 FT10 FT11 FT12 | S03 S05 S07 S08 S09 S11 S13 S14 | aircraft, pilots, data_regions, data_pack_versions, wx_cache | /packs, /wx |
| 3. Should-haves | FT13–FT18 FT23 | S03 S04 S09 S12 S15 | user_waypoints | billing, filing channel (to design) |
| 4. Could-haves | FT19–FT22 | S03 S16 S17 | logbook_entries | — |
| 5. Fixes (replica-entrepreneur) | — | — | — | — |

Milestone 1 proves the hard part early: enter a route, see it draw on an
offline map with own-ship. If that is not smooth, nothing else matters.

Next: `/replica-design`.

# Recon map: Garmin Pilot (Android tablet)

Scope: the VFR core — plan a route, see it on a moving map, check weather and
airport info, fly it. Not IFR charts, not avionics hardware.
For: general aviation pilots in Uruguay and the region (a product to sell).
Date: 2026-11-11
Terms checked: **not yet, pending a lawyer.** Garmin's software licence for
its aviation products forbids reverse engineering and derivative works of the
software. This rebuild works clean-room from the public user's guide and other
public sources only; it never decompiles the app. Whether Garmin's terms
forbid using the app to build a competing product is a separate legal question,
unresolved here. Reverse-engineering tools (REA, Ghidra, jadx) are installed in
this session's environment and must not be used in this project.

## Sources

| # | source | URL | date read | notes |
| --- | --- | --- | --- | --- |
| 1 | Garmin Pilot for Android User's Guide, Rev. Z (sw 8.3.11+) | static.garmin.com/pumac/190-01532-00_z.pdf (via user upload) | 2026-11-11 | the main source; 2023, so newer features may be missing |
| 2 | Google Play listing | play.google.com/store/apps/details?id=com.digcy.pilot | 2026-11-11 | pitch, ratings |
| 3 | Pricing comparisons | aerocorner.com, avbrief.com | 2026-11-11 | Standard ~USD 110/yr, Premium ~USD 210/yr, regional LatAm plan |
| 4 | Kitplanes / Garmin newsroom | kitplanes.com, garmin.com | 2026-11-11 | Android feature history |
| 5 | DINACIA AIP Uruguay | dinacia.gub.uy/ais | 2026-11-11 | official UY aero data; licence/cost to confirm |
| 6 | openAIP | openaip.net | 2026-11-11 | worldwide airspace/airports; licence conflict, confirm |
| 7 | aviationweather.gov (NOAA) | aviationweather.gov/data/api | 2026-11-11 | public METAR/TAF API; UY coverage to verify |

## Core loop

A pilot enters departure and destination, Garmin Pilot builds a route and a
navlog, the pilot checks weather and airport data along it, then follows the
route on a moving map that shows own-ship position (the "Plan, File, Fly, Log"
model in Garmin's own words).

## Screens

Screenshots for replica-diff go in `replica/screens/` as `S07-desktop.png` /
`S07-mobile.png` (tablet landscape 1440x900, phone 390x844). None captured yet;
the user has no Garmin Pilot account, so these stay empty until the clone has
its own screens to diff, or public screenshots are sourced.

| ID | screen | how to reach | purpose | key components | states seen (from manual) |
| --- | --- | --- | --- | --- | --- |
| S01 | New-user setup wizard | first launch | EULA, location permission, required downloads, pilot/aircraft/how-you-fly/where-you-fly | agree button, permission prompt, download progress, slider (radius), green check per section | first run only; downloading; skip to sign-in |
| S02 | Sign in / account | wizard or Home | authenticate, manage subscription | email/password fields, sign-in button | signed out, signed in, offline |
| S03 | Map page (Fly) | default on open | moving map, own-ship, route, overlays | pan/pinch zoom, map/chart selector, overlay controls, nav bar, Direct-To, Nearest | no GPS (plan only), no data (needs prior download), full vs split screen |
| S04 | Map settings / overlays | Map context menu | choose base map (VFR/IFR/Borders), overlays, opacities | toggles, sliders, radar/IR colour | — |
| S05 | Flight plan editor (Plan) | Plan tab | enter and edit the route | departure/destination fields, FastFind waypoint entry, waypoint list, Actions menu, altitude | empty plan, invalid waypoint, plan loaded |
| S06 | FastFind waypoint entry | tap a waypoint field | predictive waypoint lookup | text field, predictive list | no match |
| S07 | Trip planning (File) | File tab | refine the plan to file: times, fuel, altitude | departure time, cruise, fuel, aircraft picker | — |
| S08 | Navlog | File > Navlog | leg-by-leg plan: ETE, ETA, distance, heading, fuel | table of legs | — |
| S09 | Weather briefing (Brief) | File > Brief | textual/graphical brief for the route | METAR, TAF, winds aloft, NOTAM, TFR sections | stale data age, offline |
| S10 | File flight plan | File > File | submit the plan to a filing provider | form, submit | provider error, filed, US-only providers |
| S11 | Airport information | tap airport, or Plan | runways, frequencies, fuel, weather, comments | tabs: info, weather, charts, FBO | no data for small UY fields |
| S12 | Weather widgets | split-screen / Widgets | per-airport weather windows | METAR/TAF/winds/NOTAM widgets | stale, missing |
| S13 | Downloads | Settings > Downloads | offline databases and maps by region | region list, size, download/update, progress | needed, downloading, up to date, no wifi |
| S14 | Settings — Pilot & Aircraft | Settings | pilot profile, personal minimums, aircraft list | forms, aircraft list, performance fields | empty, saved (green check) |
| S15 | Weight and balance | Settings / tools | CG and weight per aircraft | weight fields, CG chart | in/out of envelope |
| S16 | Logbook (Log) | Log tab | flight log entries, currency, reports | entries list, auto-log, endorsements | empty, manual entry, auto-logged |
| S17 | Checklists | tools | custom checklists | list, items, check-off | — |

## Flows

```
F01 Plan a VFR route
    S03 map -> S05 flight plan (enter dep/dest via S06 FastFind) ->
    route drawn on S03 -> edit legs -> S08 navlog
    edge: unknown waypoint, no aircraft selected, route crosses no-data region

F02 Fly the route (in flight)
    S03 map with own-ship -> Direct-To / Nearest -> follow route
    edge: no GPS (nav disabled, plan only), no prior download (blank map)

F03 Weather along the route
    S05/S07 route -> S09 brief -> S12 widgets per airport
    edge: stale weather age, offline, airport with no station

F04 Airport lookup
    S03 or S05 -> tap airport -> S11 info (runways, freq, fuel)
    edge: small UY aerodrome with sparse data

F05 Set up pilot and aircraft
    S01/S14 -> pilot profile + personal minimums -> add aircraft + performance
    edge: aircraft not in list (manual entry)

F06 Keep data offline
    S13 downloads -> pick region -> download -> use without internet
    edge: no wifi, storage full, update available
```

Happy-path clicks to beat for F01: Garmin's own flow is roughly dep, dest,
confirm — 3 to 4 taps. The clone should match or beat that.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, icon | default, pressed, disabled | all |
| Text field | text, numeric, waypoint (FastFind) | empty, typing, predictive list, invalid | S05,S06,S07,S14 |
| Tab bar | bottom nav | Plan, File, Fly, Log, (Map) | app shell |
| Map canvas | VFR, IFR, Borders base | pan, zoom, own-ship, route, overlays | S03 |
| Overlay toggle + opacity slider | weather, airspace, terrain | on/off | S03,S04 |
| Data table | navlog, logbook, W&B | empty, filled | S08,S15,S16 |
| Download row | region | needed, downloading, done, update | S13 |
| Widget | METAR, TAF, winds, NOTAM | fresh, stale, missing | S12 |
| Alert/toast | time, location | — | S03 |

## Inferred data model

```
Pilot        id, name, phone, address, personal_minimums{vfr, ifr, wind},
             how_you_fly (VFR | VFR/IFR), typical_radius
             evidence: S01 wizard, S14 settings · confidence: high

Aircraft     id, type, tail_number, cruise_speed, fuel_burn, fuel_capacity,
             climb/descent, glide_ratio, best_glide_speed, weight_balance{...}
             evidence: S14 aircraft edit, Glide section, W&B · confidence: high

FlightPlan   id, aircraft_id, departure, destination, waypoints[],
             cruise_altitude, departure_time, cruise_speed, fuel_plan,
             status (planned | filed | active)
             evidence: S05/S07/S08, filing · confidence: high

Waypoint     id, identifier, type (airport | VOR | NDB | intersection | VRP |
             user), lat, lon, name
             evidence: FastFind, Nearest by type · confidence: high

Airport      icao/ident, name, lat, lon, elevation, runways[], frequencies[],
             fuel[], comments
             evidence: S11 airport info · confidence: high

WeatherProduct  station, type (METAR|TAF|winds|NOTAM|TFR|SIGMET), issued_at,
                raw_text, parsed
                evidence: S09 brief, S12 widgets · confidence: high

LogbookEntry id, date, aircraft_id, from, to, times, endorsements, track
             evidence: S16 logbook · confidence: medium

DatabaseRegion  id, name, bbox, products[], size, version, downloaded_at
                evidence: S13 downloads · confidence: medium
```

## Out of scope (cannot or should not be cloned)

Recorded as `skip` rows in `features.csv`:

- **Garmin's licensed charts**: FliteCharts, SafeTaxi, geo-referenced IFR
  plates, VFR sectionals/TAC. Licensed cartography, not ours to ship.
- **US filing providers** (Leidos/DUATS) and **AOPA Airport Directory**:
  US-specific, licensed. The clone files through the local/regional channel.
- **Connext and avionics hardware** (Flight Stream, GDL, GTX, G3X, GI 275),
  **SiriusXM**, **ADS-B traffic**, **Synthetic Vision**, **terrain/obstacle
  hardware alerts**: tied to Garmin devices or paid data feeds.
- **Garmin's aviation databases** themselves: replaced by openAIP + DINACIA +
  NOAA, subject to their licences (all three to confirm — see Sources).

## Size

Screens ~17, flows 6, entities 8. Hard parts: the moving map with real
aeronautical data (airspace, airports) and own-ship GPS; a reliable,
licence-clean data pipeline for Uruguay (DINACIA/openAIP/NOAA); offline
databases; weather parsing; and the accuracy and safety bar an EFB carries.
Size: **XL** for a full clone. The chosen slice (VFR plan + map, one region)
is **L**, and only if the data-licence question is answered first.

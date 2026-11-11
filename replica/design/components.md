# Component specs — clau-garm

Dark EFB theme. Touch targets are at least 48dp (`touch.min-target`) because
the app is used in a cockpit with gloves and turbulence. Every colour is a
token; no raw hex in components. React Native primitives, so "focus-visible"
means the keyboard/D-pad focus ring on the few platforms that have it, and the
real work is large hit targets and high contrast. Copy is written fresh, never
Garmin's.

## Button
```
variants  primary, secondary, ghost, danger
sizes     sm 40dp, md 48dp, lg 56dp  (height; min hit area 48dp)
states    default, pressed, disabled, loading
tokens    primary: bg accent, text on-accent · secondary: bg surface-raised, text,
          border border · ghost: text, no bg · danger: bg danger, text on-accent
          radius md · font sm/600
a11y      accessibilityRole="button"; loading keeps the label for screen readers;
          disabled sets accessibilityState
used on   S01,S02,S05,S07,S10,S13,S14
```

## Text field
```
variants  text, numeric, waypoint (FastFind predictive)
sizes     48dp height, 17pt text
states    empty (placeholder text-muted), typing, predictive list, invalid (border danger),
          disabled
tokens    bg surface, text, border border-input, focus border focus-ring (2dp)
a11y      label always present (not placeholder-only); invalid sets accessibilityState
          and shows an error line in danger
used on   S05,S06,S07,S14
```

## Tab bar (app shell)
```
items     Plan, File, Fly, Log  (+ Map is the default Fly screen)
sizes     56dp height, icon 24dp + label
states    active (text + accent indicator), inactive (text-muted)
tokens    bg surface, active text, inactive text-muted, top border border
a11y      accessibilityRole="tab", selected state; labels always visible
used on   every screen
```

## Map canvas
```
layers    base (VFR vector), airspace (map.airspace), airports, navaids,
          route (map.route), own-ship (map.ownship), weather overlay, terrain
controls  pan (drag), zoom (pinch / double-tap / +- buttons 48dp),
          north-up/track-up toggle, overlay menu
states    plan mode (no GPS: no own-ship, a notice), in-flight (own-ship moving),
          no pack for this area (prompt to download), stale data (amber banner)
tokens    map.* semantic colours; controls use surface + text
a11y      the map is a canvas; controls beside it are the accessible surface,
          each a 48dp labelled button
used on   S03
```

## Overlay toggle + opacity
```
variants  weather, airspace, terrain, traffic
states    on, off; slider 0–100% opacity
tokens    on: accent · off: text-muted · track border, thumb accent
a11y      Switch role + label; slider has accessibilityValue
used on   S03,S04
```

## Data table (navlog, logbook, W&B)
```
columns   per screen (navlog: leg, dist, course, ETE, ETA, fuel)
sizes     row 48dp, data font 22/600 (type.data) for in-flight legibility
states    empty (write a fresh empty-state line), filled, row selected
tokens    bg surface, header text-muted, body text, row divider border
a11y      header cells labelled; rows are not buttons unless they navigate
used on   S08,S15,S16
```

## Download row
```
states    needed (download button), downloading (progress + size), done (check),
          update available (update button), error (retry, danger)
tokens    text, size in text-muted, progress accent, error danger
a11y      progress has accessibilityValue; one 48dp action per row
used on   S13
```

## Weather widget
```
variants  METAR, TAF, winds aloft, NOTAM
states    fresh, stale (amber age badge — warning), missing (write a fresh line),
          loading
tokens    bg surface-raised, text, age badge warning, flight-category dot uses
          map.wx-* (vfr/mvfr/ifr/lifr)
a11y      age is read out, not colour-only; category dot has a text label too
used on   S09,S12
```

## Banner / alert
```
variants  info, warning (stale/expired data), danger (safety), time/location alert
states    shown, dismissed
tokens    warning: bg surface, left bar warning, text · danger: left bar danger
a11y      accessibilityLiveRegion for alerts that appear in flight; never colour-only
used on   S03,S09,S13
```

## Notes that carry the EFB's safety bar

- **Never colour alone.** Flight-category and stale-data states always carry a
  label or icon too — a pilot may be colour-blind, and the screen may be washed
  out by sun. (This is why every `map.wx-*` use pairs with text.)
- **Night use.** The dark theme is the day-glare and night default; a dimmer
  and a future red-night mode are design variants, not new components.
- **Legibility in motion.** In-flight numbers use `type.data` (22/600), larger
  than body text.

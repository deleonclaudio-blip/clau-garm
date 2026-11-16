#!/usr/bin/env python3
"""Generate the OACI-style icon set for the MapLibre map.

Writes, under assets/sprites/:
  <name>.png, <name>@2x.png, <name>@3x.png   individual icons (RN <Images/>)
  sprite.png / sprite.json                    packed MapLibre sprite sheet (1x)
  sprite@2x.png / sprite@2x.json              packed sheet (2x)

Icons: ownship, ad_paved, ad_unpaved, vor, ndb, wpt. Transparent background,
simple monochrome symbology close to ICAO chart conventions. Pillow only.
"""

import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "assets" / "sprites"
BASE = 24  # logical pixels at 1x

# colours (match replica/design tokens)
WHITE = (232, 237, 242, 255)
GREEN = (34, 197, 94, 255)
MUTED = (154, 167, 180, 255)
OWN = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def canvas(scale):
    s = BASE * scale
    img = Image.new("RGBA", (s, s), CLEAR)
    return img, ImageDraw.Draw(img), s


def draw_ownship(d, s, col=OWN):
    # aircraft arrow pointing up (rotated at runtime by iconRotate)
    w = s * 0.5
    cx = s / 2
    d.polygon([(cx, s * 0.12), (cx + w / 2, s * 0.8), (cx, s * 0.64),
               (cx - w / 2, s * 0.8)], fill=col)


def draw_ad_paved(d, s, col=WHITE):
    r = s * 0.34
    c = s / 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=col)
    # runway bar through it (hard-surface cue)
    lw = max(1, int(s * 0.08))
    d.line([(c - r * 0.8, c), (c + r * 0.8, c)], fill=CLEAR, width=lw)


def draw_ad_unpaved(d, s, col=WHITE):
    r = s * 0.34
    c = s / 2
    lw = max(2, int(s * 0.1))
    d.ellipse([c - r, c - r, c + r, c + r], outline=col, width=lw)


def draw_vor(d, s, col=GREEN):
    # hexagon outline (VOR / VOR-DME)
    c = s / 2
    r = s * 0.36
    pts = [(c + r * math.cos(math.radians(60 * i - 90)),
            c + r * math.sin(math.radians(60 * i - 90))) for i in range(6)]
    d.polygon(pts, outline=col, width=max(2, int(s * 0.09)))


def draw_ndb(d, s, col=GREEN):
    # filled dot with a ring (NDB)
    c = s / 2
    d.ellipse([c - s * 0.12, c - s * 0.12, c + s * 0.12, c + s * 0.12], fill=col)
    r = s * 0.34
    d.ellipse([c - r, c - r, c + r, c + r], outline=col, width=max(1, int(s * 0.06)))


def draw_wpt(d, s, col=MUTED):
    # small upward triangle (intersection / reporting point)
    c = s / 2
    r = s * 0.3
    d.polygon([(c, c - r), (c + r * 0.87, c + r * 0.5), (c - r * 0.87, c + r * 0.5)],
              outline=col, width=max(2, int(s * 0.09)))


ICONS = {
    "ownship": draw_ownship,
    "ad_paved": draw_ad_paved,
    "ad_unpaved": draw_ad_unpaved,
    "vor": draw_vor,
    "ndb": draw_ndb,
    "wpt": draw_wpt,
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    # individual density variants for the RN <Images/> component
    for name, fn in ICONS.items():
        for scale, suffix in ((1, ""), (2, "@2x"), (3, "@3x")):
            img, d, s = canvas(scale)
            fn(d, s)
            img.save(OUT / f"{name}{suffix}.png")
    # packed MapLibre sprite sheets at 1x and 2x
    for scale, suffix in ((1, ""), (2, "@2x")):
        s = BASE * scale
        sheet = Image.new("RGBA", (s * len(ICONS), s), CLEAR)
        index = {}
        for i, (name, fn) in enumerate(ICONS.items()):
            img, d, _ = canvas(scale)
            fn(d, s)
            sheet.paste(img, (i * s, 0))
            index[name] = {"x": i * s, "y": 0, "width": s, "height": s,
                           "pixelRatio": scale}
        sheet.save(OUT / f"sprite{suffix}.png")
        (OUT / f"sprite{suffix}.json").write_text(json.dumps(index, indent=2))
    print(f"Wrote {len(ICONS)} icons (1x/2x/3x) + packed sprite sheets to {OUT}/")


if __name__ == "__main__":
    main()

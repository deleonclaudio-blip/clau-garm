# AIRAC refresh for the Uruguay region pack.
# Update data/aip_uruguay_data.json for the new cycle, then: make
PY ?= python3

.PHONY: all build validate app sprites clean
all: build validate app sprites

build:
	$(PY) build_pipeline.py

validate: build
	$(PY) validate.py
	$(PY) test_spatial.py

# Regenerate the app's in-memory data module from the same JSON.
app:
	cd .. && $(PY) data/gen_app_data.py

sprites:
	$(PY) make_sprites.py

clean:
	rm -rf ../dist

# --- Base map (Protomaps / OpenStreetMap, offline PMTiles) --------------------
# Cuts the Uruguay bounding box out of the global Protomaps basemap into a small
# local base_uruguay.pmtiles. Needs the `pmtiles` CLI (https://github.com/
# protomaps/go-pmtiles/releases) on PATH. The global build is a single hosted
# PMTiles file; `extract` downloads ONLY the tiles in the bbox over HTTP range
# requests, so it never pulls the whole planet.
UY_BBOX ?= -58.6,-35.5,-53.0,-30.0
UY_MINZOOM ?= 0
UY_MAXZOOM ?= 12
PMTILES_SRC ?= https://build.protomaps.com/20240101.pmtiles   # pin a dated build
BASEMAP_OUT ?= ../assets/base_uruguay.pmtiles

.PHONY: basemap basemap-check
basemap-check:
	@command -v pmtiles >/dev/null || { echo "Install the pmtiles CLI first: https://github.com/protomaps/go-pmtiles/releases"; exit 1; }

basemap: basemap-check
	pmtiles extract "$(PMTILES_SRC)" "$(BASEMAP_OUT)" \
	  --bbox="$(UY_BBOX)" --minzoom=$(UY_MINZOOM) --maxzoom=$(UY_MAXZOOM)
	pmtiles show "$(BASEMAP_OUT)" | head -20
	@echo "Wrote $(BASEMAP_OUT). Bundle it with the app or download it on device, then set basemapAvailable=true."

# --- Offline glyphs (text labels without a font server) -----------------------
# Downloads the Noto Sans ranges the app needs into assets/glyphs/NotoSans/.
# Stored under a no-space folder so the file:// glyph template has no encoding
# ambiguity; the app sets text-font "NotoSans" to match.
GLYPH_FONT ?= Noto%20Sans%20Regular
GLYPH_RANGES ?= 0-255 256-511 8192-8447
GLYPH_SRC ?= https://raw.githubusercontent.com/protomaps/basemaps-assets/main/fonts
GLYPH_OUT ?= ../assets/glyphs/NotoSans

.PHONY: glyphs
glyphs:
	mkdir -p "$(GLYPH_OUT)"
	@for r in $(GLYPH_RANGES); do \
	  echo "fetch $$r.pbf"; \
	  curl -fsSL -o "$(GLYPH_OUT)/$$r.pbf" "$(GLYPH_SRC)/$(GLYPH_FONT)/$$r.pbf"; \
	done
	@echo "Wrote glyphs to $(GLYPH_OUT)/"

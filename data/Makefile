# AIRAC refresh for the Uruguay region pack.
# Update data/aip_uruguay_data.json for the new cycle, then: make
PY ?= python3

.PHONY: all build validate app clean
all: build validate app

build:
	$(PY) build_pipeline.py

validate: build
	$(PY) validate.py

# Regenerate the app's in-memory data module from the same JSON.
app:
	cd .. && $(PY) data/gen_app_data.py

clean:
	rm -rf ../dist

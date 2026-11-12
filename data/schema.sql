-- clau-garm region pack schema (SQLite). Compiled read-only data for the device.
-- Source: AIP Uruguay (DINACIA). Licence pending — see replica/data-licensing.md.
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS aerodromes (
    icao TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    elev_m INTEGER,
    elev_ft INTEGER,
    mag_var REAL,
    traffic TEXT,
    operator TEXT,
    hours TEXT,
    certified_lar139 INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS runways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icao TEXT NOT NULL,
    rwy TEXT NOT NULL,
    length_m INTEGER,
    width_m INTEGER,
    surface TEXT,
    pcn TEXT,
    tora_m INTEGER,
    lda_m INTEGER,
    thr1_lat REAL,
    thr1_lon REAL,
    thr2_lat REAL,
    thr2_lon REAL,
    FOREIGN KEY (icao) REFERENCES aerodromes(icao) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS frequencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    icao TEXT NOT NULL,
    service TEXT NOT NULL,
    callsign TEXT,
    freq_mhz REAL NOT NULL,
    secondary_mhz REAL,
    FOREIGN KEY (icao) REFERENCES aerodromes(icao) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS navaids (
    ident TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    freq TEXT NOT NULL,
    ch TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    elev_m INTEGER
);

CREATE TABLE IF NOT EXISTS waypoints (
    ident TEXT PRIMARY KEY,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    route TEXT
);

CREATE TABLE IF NOT EXISTS surface_lights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    intensity TEXT,
    characteristics TEXT,
    hours TEXT
);

-- Airspace is a parent polygon with one or more vertical layers. A single
-- lateral shape (e.g. Carrasco TMA) can carry several classes stacked by
-- altitude (G / C / A), so classes and limits live in the child table, never
-- flattened onto the parent.
CREATE TABLE IF NOT EXISTS airspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,                   -- TMA | CTR | ATZ | FIZ
    min_lat REAL, max_lat REAL, min_lon REAL, max_lon REAL,  -- bbox, for the R-Tree
    geometry_json TEXT NOT NULL  -- closed WGS84 polygon ring(s), [[ [lon,lat], ... ]]
);

-- One row per vertical stratum. *_val/_unit/_ref keep the published form; *_ft
-- is the converted envelope used for the vertical filter (GND=0, FL*100,
-- metres*3.28084). schedule is non-null when the class is time-limited.
CREATE TABLE IF NOT EXISTS airspace_layers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    airspace_id INTEGER NOT NULL,
    airspace_class TEXT,
    lower_val REAL, lower_unit TEXT, lower_ref TEXT, lower_ft REAL,
    upper_val REAL, upper_unit TEXT, upper_ref TEXT, upper_ft REAL,
    schedule TEXT,
    FOREIGN KEY (airspace_id) REFERENCES airspaces(id) ON DELETE CASCADE
);

-- Spatial index over airspace bounding boxes: the pre-filter before the exact
-- point-in-polygon test. id matches airspaces.id.
CREATE VIRTUAL TABLE IF NOT EXISTS airspace_rtree USING rtree(
    id, min_lat, max_lat, min_lon, max_lon
);

CREATE VIRTUAL TABLE IF NOT EXISTS spatial_index USING rtree(
    id, min_lat, max_lat, min_lon, max_lon
);

CREATE TABLE IF NOT EXISTS spatial_lookup (
    rtree_id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    UNIQUE(entity_type, entity_id)
);

CREATE TRIGGER IF NOT EXISTS trg_aerodromes_ai AFTER INSERT ON aerodromes
BEGIN
    INSERT INTO spatial_lookup(entity_type, entity_id) VALUES ('aerodrome', NEW.icao);
    INSERT INTO spatial_index(id, min_lat, max_lat, min_lon, max_lon)
    VALUES (last_insert_rowid(), NEW.lat, NEW.lat, NEW.lon, NEW.lon);
END;

CREATE TRIGGER IF NOT EXISTS trg_navaids_ai AFTER INSERT ON navaids
BEGIN
    INSERT INTO spatial_lookup(entity_type, entity_id) VALUES ('navaid', NEW.ident);
    INSERT INTO spatial_index(id, min_lat, max_lat, min_lon, max_lon)
    VALUES (last_insert_rowid(), NEW.lat, NEW.lat, NEW.lon, NEW.lon);
END;

CREATE TRIGGER IF NOT EXISTS trg_waypoints_ai AFTER INSERT ON waypoints
BEGIN
    INSERT INTO spatial_lookup(entity_type, entity_id) VALUES ('waypoint', NEW.ident);
    INSERT INTO spatial_index(id, min_lat, max_lat, min_lon, max_lon)
    VALUES (last_insert_rowid(), NEW.lat, NEW.lat, NEW.lon, NEW.lon);
END;

CREATE INDEX IF NOT EXISTS idx_aerodromes_coords ON aerodromes(lat, lon);
CREATE INDEX IF NOT EXISTS idx_aerodromes_name ON aerodromes(name);
CREATE INDEX IF NOT EXISTS idx_runways_icao ON runways(icao);
CREATE INDEX IF NOT EXISTS idx_frequencies_icao ON frequencies(icao);
CREATE INDEX IF NOT EXISTS idx_navaids_coords ON navaids(lat, lon);
CREATE INDEX IF NOT EXISTS idx_waypoints_coords ON waypoints(lat, lon);
CREATE INDEX IF NOT EXISTS idx_airspaces_name ON airspaces(name);
CREATE INDEX IF NOT EXISTS idx_airspace_layers_parent ON airspace_layers(airspace_id);

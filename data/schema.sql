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

-- Airspace is now queryable in SQL (not only in GeoJSON). Limits are stored as
-- value + unit + reference so the metric/FL/feet mix is never coerced. The raw
-- class string is kept verbatim because layered classes (e.g. Carrasco TMA:
-- G/C/A by altitude) cannot be reduced to one value without losing meaning.
CREATE TABLE IF NOT EXISTS airspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    class_raw TEXT,              -- verbatim; may describe several layers
    lower_val REAL, lower_unit TEXT, lower_ref TEXT,   -- unit: ft|m|fl  ref: gnd|msl|std
    upper_val REAL, upper_unit TEXT, upper_ref TEXT,
    center_lat REAL, center_lon REAL, radius_nm REAL,
    geom TEXT                    -- GeoJSON Polygon coordinates
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

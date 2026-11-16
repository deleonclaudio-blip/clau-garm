import React, { useMemo } from "react";
import type { FeatureCollection } from "geojson";
import { StyleSheet, View } from "react-native";
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
} from "@maplibre/maplibre-react-native";
import type { Waypoint } from "../domain/types";
import { color, mapColor } from "./theme";
import type { Ownship } from "./useOwnship";

import airspacesGeo from "../../assets/aero/airspaces.geojson";
import runwaysGeo from "../../assets/aero/runways.geojson";
import pointsGeo from "../../assets/aero/points_nav.geojson";

export interface AeroMapProps {
  route: Waypoint[];
  ownship: Ownship | null;
  northUp: boolean;
  /** True once base_uruguay.pmtiles is present on the device. When false the
   * map draws the aeronautical layers over a neutral background, so they are
   * testable before the basemap is downloaded. */
  basemapAvailable?: boolean;
}

// Base style built in code so the basemap source is only referenced when the
// PMTiles file exists; otherwise a clean neutral background (no broken tiles).
function baseStyle(basemapAvailable: boolean) {
  if (!basemapAvailable) {
    return {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {},
      layers: [{ id: "bg", type: "background", paint: { "background-color": color.bg } }],
    } as const;
  }
  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: { basemap: { type: "vector", url: "pmtiles://base_uruguay.pmtiles" } },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": color.bg } },
      { id: "water", type: "fill", source: "basemap", "source-layer": "water",
        paint: { "fill-color": "#0e2233" } },
      { id: "roads", type: "line", source: "basemap", "source-layer": "transportation",
        paint: { "line-color": "#223042", "line-width": 0.6 } },
    ],
  } as const;
}

function routeFeature(route: Waypoint[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: route.length >= 2
      ? [{ type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: route.map((w) => [w.lon, w.lat]) } }]
      : [],
  } as FeatureCollection;
}

function ownshipFeature(o: Ownship | null): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: o
      ? [{ type: "Feature",
          properties: { track: o.trackDeg ?? 0 },
          geometry: { type: "Point", coordinates: [o.lon, o.lat] } }]
      : [],
  } as FeatureCollection;
}

export function AeroMap({ route, ownship, northUp, basemapAvailable = false }: AeroMapProps) {
  const style = useMemo(() => baseStyle(basemapAvailable), [basemapAvailable]);
  const center: [number, number] = ownship
    ? [ownship.lon, ownship.lat]
    : route[0] ? [route[0].lon, route[0].lat] : [-56.03, -34.83]; // Carrasco
  const heading = !northUp && ownship?.trackDeg != null ? ownship.trackDeg : 0;

  return (
    <View style={styles.fill}>
      <MapView style={styles.fill} mapStyle={style as object} compassEnabled={northUp}>
        <Camera
          zoomLevel={9}
          centerCoordinate={center}
          heading={heading}
          animationMode="linearTo"
          animationDuration={500}
        />

        {/* Airspace: fill + outline + label */}
        <ShapeSource id="airspaces" shape={airspacesGeo as FeatureCollection}>
          <FillLayer id="as-fill" style={{ fillColor: mapColor.airspace, fillOpacity: 0.08 }} />
          <LineLayer id="as-line" style={{ lineColor: mapColor.airspace, lineWidth: 1.2, lineOpacity: 0.8 }} />
          <SymbolLayer id="as-label" style={{
            textField: ["get", "name"], textSize: 11, symbolPlacement: "line",
            textColor: color.textMuted, textHaloColor: color.bg, textHaloWidth: 1,
          }} />
        </ShapeSource>

        {/* Runways */}
        <ShapeSource id="runways" shape={runwaysGeo as FeatureCollection}>
          <LineLayer id="rwy-line" style={{ lineColor: color.text, lineWidth: 2 }} />
        </ShapeSource>

        {/* Aerodromes / navaids / waypoints */}
        <ShapeSource id="points" shape={pointsGeo as FeatureCollection}>
          <CircleLayer id="pt-dot" style={{
            circleRadius: 4,
            circleColor: ["match", ["get", "layer_type"], "aerodrome", color.text,
              "navaid", mapColor.wxVfr, color.textMuted],
            circleStrokeColor: color.bg, circleStrokeWidth: 1,
          }} />
          <SymbolLayer id="pt-label" style={{
            textField: ["get", "ident"], textSize: 11, textOffset: [0, 1.1], textAnchor: "top",
            textColor: color.text, textHaloColor: color.bg, textHaloWidth: 1,
          }} />
        </ShapeSource>

        {/* Active route */}
        <ShapeSource id="route" shape={routeFeature(route)}>
          <LineLayer id="route-line" style={{ lineColor: mapColor.route, lineWidth: 3 }} />
        </ShapeSource>

        {/* Own-ship: a dot with a heading triangle rotated to track */}
        <ShapeSource id="ownship" shape={ownshipFeature(ownship)}>
          <SymbolLayer id="ownship-icon" style={{
            iconImage: "ownship", iconRotate: ["get", "track"], iconRotationAlignment: "map",
            iconAllowOverlap: true, iconSize: 1,
          }} />
          <CircleLayer id="ownship-dot" style={{
            circleRadius: 5, circleColor: mapColor.ownship,
            circleStrokeColor: color.bg, circleStrokeWidth: 2,
          }} />
        </ShapeSource>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { distanceNm } from "../domain/geo";
import type { Waypoint } from "../domain/types";
import { color, mapColor, space, type } from "./theme";

/**
 * A schematic plan view of the route: waypoints projected to the drawing area
 * and joined in order, with own-ship if a position is given. This is the v1
 * stand-in for the MapLibre moving map (which needs a device and a data pack);
 * it proves the data flow — enter a route, see it drawn — on any target.
 * The real map replaces this component behind the same props.
 */
export interface RouteViewProps {
  waypoints: Waypoint[];
  ownship?: { lat: number; lon: number };
  width?: number;
  height?: number;
}

export function RouteView({ waypoints, ownship, width = 320, height = 240 }: RouteViewProps) {
  if (waypoints.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No route yet. Add a departure and a destination.</Text>
      </View>
    );
  }

  const pad = 28;
  const lats = waypoints.map((w) => w.lat);
  const lons = waypoints.map((w) => w.lon);
  if (ownship) {
    lats.push(ownship.lat);
    lons.push(ownship.lon);
  }
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const spanLat = maxLat - minLat || 1;
  const spanLon = maxLon - minLon || 1;

  // lon -> x, lat -> y (north up): higher lat is higher on screen
  const px = (lon: number) => pad + ((lon - minLon) / spanLon) * (width - 2 * pad);
  const py = (lat: number) => height - pad - ((lat - minLat) / spanLat) * (height - 2 * pad);

  const points = waypoints.map((w) => `${px(w.lon)},${py(w.lat)}`).join(" ");
  const total = waypoints
    .slice(1)
    .reduce((s, w, i) => s + distanceNm(waypoints[i], w), 0);

  return (
    <View style={[styles.frame, { width, height }]}>
      <Svg width={width} height={height}>
        {waypoints.length > 1 ? (
          <Polyline points={points} fill="none" stroke={mapColor.route} strokeWidth={2} />
        ) : null}
        {waypoints.map((w) => (
          <React.Fragment key={w.ident}>
            <Circle cx={px(w.lon)} cy={py(w.lat)} r={4} fill={color.text} />
            <SvgText
              x={px(w.lon) + 7}
              y={py(w.lat) - 6}
              fill={color.text}
              fontSize={12}
            >
              {w.ident}
            </SvgText>
          </React.Fragment>
        ))}
        {ownship ? (
          <>
            <Circle cx={px(ownship.lon)} cy={py(ownship.lat)} r={6} fill={mapColor.ownship} />
            <Line
              x1={px(ownship.lon)}
              y1={py(ownship.lat) - 10}
              x2={px(ownship.lon)}
              y2={py(ownship.lat) + 10}
              stroke={mapColor.ownship}
              strokeWidth={2}
            />
          </>
        ) : null}
      </Svg>
      <Text style={styles.caption}>
        schematic · {total.toFixed(0)} nm · real moving map comes with the data pack
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: color.surface, borderRadius: 10, overflow: "hidden" },
  caption: {
    position: "absolute",
    bottom: space[1],
    left: space[2],
    color: color.textMuted,
    fontSize: type.xs.fontSize,
  },
  empty: {
    backgroundColor: color.surface,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    padding: space[4],
  },
  emptyText: { color: color.textMuted, fontSize: type.sm.fontSize, textAlign: "center" },
});

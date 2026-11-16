import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { AirspaceHit, AirspaceLayer } from "../domain/airspace";
import { color, radius, space, type } from "./theme";

export interface AirspaceBannerProps {
  hits: AirspaceHit[];
}

// A class letter colours the bar by how controlled it is (advisory only).
function classTone(cls: string | null): string {
  const c = (cls ?? "").trim().toUpperCase();
  if (c.startsWith("A") || c.startsWith("B") || c.startsWith("C")) return color.warning;
  if (c.startsWith("D") || c.startsWith("E")) return color.success;
  return color.textMuted; // G / unknown
}

function limitText(l: AirspaceLayer | null): string {
  if (!l) return "—";
  const fmt = (v: number | null, unit: string | null, ref: string | null) => {
    if (ref === "gnd") return "GND";
    if (unit === "fl" && v != null) return `FL${v}`;
    if (unit === "m" && v != null) return `${v} m`;
    if (v != null) return `${Math.round(v)} ft`;
    return ref ?? "?";
  };
  return `${fmt(l.lowerVal, l.lowerUnit, l.lowerRef)}–${fmt(l.upperVal, l.upperUnit, l.upperRef)}`;
}

/** Active-airspace alert: the airspace the aircraft is in, its ICAO class and
 * vertical band, plus the layers immediately above and below. Advisory. */
export function AirspaceBanner({ hits }: AirspaceBannerProps) {
  const active = hits.find((h) => h.insideClass != null) ?? hits[0];
  if (!active) {
    return (
      <View style={[styles.wrap, { borderLeftColor: color.textMuted }]}>
        <Text style={styles.muted}>No controlled airspace at this position.</Text>
      </View>
    );
  }
  const tone = classTone(active.insideClass);
  return (
    <View style={[styles.wrap, { borderLeftColor: tone }]} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <Text style={styles.name}>{active.name}</Text>
        <View style={[styles.badge, { backgroundColor: tone }]}>
          <Text style={styles.badgeText}>
            {active.type ?? ""}{active.insideClass ? ` · ${active.insideClass}` : ""}
          </Text>
        </View>
      </View>
      <Text style={styles.band}>Current band: {limitText(active.activeLayer)}</Text>
      <View style={styles.adj}>
        <Text style={styles.adjText}>▲ above: {active.layerAbove
          ? `${active.layerAbove.airspaceClass ?? "?"} ${limitText(active.layerAbove)}` : "—"}</Text>
        <Text style={styles.adjText}>▼ below: {active.layerBelow
          ? `${active.layerBelow.airspaceClass ?? "?"} ${limitText(active.layerBelow)}` : "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: color.surface, borderLeftWidth: 4,
    padding: space[3], borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md,
    gap: space[1],
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { color: color.text, fontSize: type.lg.fontSize, fontWeight: "700" },
  badge: { borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: 2 },
  badgeText: { color: color.onAccent, fontSize: type.sm.fontSize, fontWeight: "700" },
  band: { color: color.text, fontSize: type.base.fontSize },
  adj: { flexDirection: "row", justifyContent: "space-between", marginTop: space[1] },
  adjText: { color: color.textMuted, fontSize: type.sm.fontSize },
  muted: { color: color.textMuted, fontSize: type.sm.fontSize },
});

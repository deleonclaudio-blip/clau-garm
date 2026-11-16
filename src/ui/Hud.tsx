import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { color, radius, space, type } from "./theme";
import { fmtAlt, fmtGs, fmtHdg } from "./units";
import type { Ownship } from "./useOwnship";

export interface HudProps {
  ownship: Ownship | null;
  magHeading: number | null; // magnetic track, degrees (advisory)
  northUp: boolean;
  onToggleOrientation: () => void;
}

/** Top HUD: GPS altitude, ground speed, magnetic track, and the N-up/track-up
 * toggle. Values are advisory; GPS altitude is geometric, not pressure. */
export function Hud({ ownship, magHeading, northUp, onToggleOrientation }: HudProps) {
  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.readouts}>
        <Field label="GPS ALT" value={ownship ? fmtAlt(ownship.altFt) : "—"} />
        <Field label="GS" value={ownship ? fmtGs(ownship.gsKt) : "—"} />
        <Field label="MAG" value={magHeading != null ? fmtHdg(magHeading) : "—"} />
      </View>
      <Pressable
        onPress={onToggleOrientation}
        accessibilityRole="button"
        accessibilityLabel={northUp ? "North up, switch to track up" : "Track up, switch to north up"}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{northUp ? "N↑" : "TRK↑"}</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    padding: space[3], gap: space[2],
  },
  readouts: { flexDirection: "row", gap: space[2] },
  field: {
    backgroundColor: color.surface, borderRadius: radius.md,
    paddingHorizontal: space[3], paddingVertical: space[1], minWidth: 72,
    borderWidth: 1, borderColor: color.border,
  },
  label: { color: color.textMuted, fontSize: type.xs.fontSize, fontWeight: "500" },
  value: { color: color.text, fontSize: type.data.fontSize, fontWeight: "700" },
  toggle: {
    minWidth: 56, minHeight: 48, borderRadius: radius.md, alignItems: "center",
    justifyContent: "center", backgroundColor: color.surfaceRaised,
    borderWidth: 1, borderColor: color.border,
  },
  toggleText: { color: color.text, fontSize: type.sm.fontSize, fontWeight: "700" },
});

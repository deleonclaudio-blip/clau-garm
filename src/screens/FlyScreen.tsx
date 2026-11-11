import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { fakeData } from "../data/store";
import { buildNavlog, formatHms } from "../domain/navlog";
import type { Aircraft, FlightPlan } from "../domain/types";
import { RouteView } from "../ui/RouteView";
import { color, space, type } from "../ui/theme";

interface Props {
  planId?: string;
  /** Optional live position; absent in plan mode (no GPS). */
  ownship?: { lat: number; lon: number };
}

export function FlyScreen({ planId, ownship }: Props) {
  const [plan, setPlan] = useState<FlightPlan | undefined>();
  const [aircraft, setAircraft] = useState<Aircraft | undefined>();

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = planId ? await fakeData.getFlightPlan(planId) : undefined;
      const acs = await fakeData.listAircraft();
      if (!alive) return;
      setPlan(p);
      setAircraft(acs.find((a) => a.id === p?.aircraftId) ?? acs[0]);
    })();
    return () => { alive = false; };
  }, [planId]);

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No active route. Build one in Plan.</Text>
      </View>
    );
  }

  const navlog = buildNavlog(plan, aircraft);

  return (
    <ScrollView contentContainerStyle={styles.body}>
      {!ownship ? (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>Plan mode — no GPS. Own-ship appears in flight.</Text>
        </View>
      ) : null}
      <View style={styles.mapWrap}>
        <RouteView waypoints={plan.waypoints} ownship={ownship} width={340} height={260} />
      </View>
      <Text style={styles.h2}>Navlog</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.cell, styles.head, styles.leg]}>Leg</Text>
        <Text style={[styles.cell, styles.head, styles.num]}>NM</Text>
        <Text style={[styles.cell, styles.head, styles.num]}>TC</Text>
        <Text style={[styles.cell, styles.head, styles.num]}>ETE</Text>
        <Text style={[styles.cell, styles.head, styles.num]}>Fuel L</Text>
      </View>
      {navlog.legs.map((l, i) => (
        <View key={i} style={styles.row}>
          <Text style={[styles.cell, styles.leg]}>{l.from}→{l.to}</Text>
          <Text style={[styles.cell, styles.num, styles.data]}>{l.distanceNm.toFixed(1)}</Text>
          <Text style={[styles.cell, styles.num, styles.data]}>{l.trueCourseDeg}°</Text>
          <Text style={[styles.cell, styles.num, styles.data]}>{formatHms(l.eteSeconds)}</Text>
          <Text style={[styles.cell, styles.num, styles.data]}>{l.fuelL.toFixed(1)}</Text>
        </View>
      ))}
      <View style={styles.totals}>
        <Text style={styles.totalText}>
          {navlog.totalDistanceNm.toFixed(0)} nm · {formatHms(navlog.totalEteSeconds)} ·{" "}
          {navlog.totalFuelL.toFixed(0)} L
        </Text>
      </View>
      <Text style={styles.disclaimer}>
        Planning aid only. No wind applied. Not for primary navigation; cross-check
        with approved sources.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], gap: space[3] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space[4] },
  muted: { color: color.textMuted, fontSize: type.base.fontSize },
  mapWrap: { alignItems: "center" },
  banner: { backgroundColor: color.surface, borderLeftWidth: 3, borderLeftColor: color.warning, padding: space[3], borderRadius: 8 },
  bannerText: { color: color.text, fontSize: type.sm.fontSize },
  h2: { color: color.text, fontSize: type.lg.fontSize, fontWeight: "600", marginTop: space[2] },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: color.border, paddingBottom: space[1] },
  row: { flexDirection: "row", minHeight: 44, alignItems: "center", borderBottomWidth: 1, borderBottomColor: color.border },
  cell: { color: color.text, fontSize: type.sm.fontSize },
  head: { color: color.textMuted, fontWeight: "600" },
  data: { fontSize: type.data.fontSize, fontWeight: "600" },
  leg: { flex: 2 },
  num: { flex: 1, textAlign: "right" },
  totals: { marginTop: space[2], alignItems: "flex-end" },
  totalText: { color: color.text, fontSize: type.data.fontSize, fontWeight: "700" },
  disclaimer: { color: color.textMuted, fontSize: type.xs.fontSize, marginTop: space[2] },
});

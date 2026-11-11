import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { fakeData } from "../data/store";
import { findAirport } from "../data/airports.uy";
import type { Airport, FlightPlan } from "../domain/types";
import { Button } from "../ui/Button";
import { RouteView } from "../ui/RouteView";
import { WaypointField } from "../ui/WaypointField";
import { color, space, type } from "../ui/theme";

interface Props {
  onPlanReady: (plan: FlightPlan) => void;
}

/** Vertical slice: enter departure + destination, build a plan, see it drawn. */
export function PlanScreen({ onPlanReady }: Props) {
  const [depText, setDepText] = useState("");
  const [destText, setDestText] = useState("");
  const [dep, setDep] = useState<Airport | undefined>();
  const [dest, setDest] = useState<Airport | undefined>();
  const [plan, setPlan] = useState<FlightPlan | undefined>();
  const [busy, setBusy] = useState(false);

  const pick = (which: "dep" | "dest") => (a: Airport) => {
    if (which === "dep") { setDep(a); setDepText(a.ident); }
    else { setDest(a); setDestText(a.ident); }
  };

  const resolve = (text: string, picked?: Airport) =>
    picked && picked.ident === text.trim().toUpperCase() ? picked : findAirport(text);

  const depResolved = resolve(depText, dep);
  const destResolved = resolve(destText, dest);
  const canBuild = !!depResolved && !!destResolved && depResolved.ident !== destResolved.ident;

  async function build() {
    if (!depResolved || !destResolved) return;
    setBusy(true);
    try {
      const p = await fakeData.createFlightPlan({
        departure: depResolved,
        destination: destResolved,
      });
      setPlan(p);
      onPlanReady(p);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Plan a VFR route</Text>
      <WaypointField
        testID="dep"
        label="Departure"
        value={depText}
        onChangeText={(t) => { setDepText(t); setDep(undefined); }}
        onPick={pick("dep")}
        invalid={depText.length >= 4 && !depResolved}
      />
      <WaypointField
        testID="dest"
        label="Destination"
        value={destText}
        onChangeText={(t) => { setDestText(t); setDest(undefined); }}
        onPick={pick("dest")}
        invalid={destText.length >= 4 && !destResolved}
      />
      <Button
        testID="build"
        label="Build route"
        onPress={build}
        disabled={!canBuild}
        loading={busy}
      />
      <View style={styles.map}>
        <RouteView waypoints={plan?.waypoints ?? []} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], gap: space[4] },
  h1: { color: color.text, fontSize: type.xl.fontSize, fontWeight: "700" },
  map: { alignItems: "center" },
});

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fakeData } from "../data/store";
import type { RegionPack } from "../data/pack";
import type { FlightPlan } from "../domain/types";
import { Button } from "../ui/Button";
import { AeroMap } from "../ui/AeroMap";
import { AirspaceBanner } from "../ui/AirspaceBanner";
import { Hud } from "../ui/Hud";
import { color, space, type } from "../ui/theme";
import { trueToMagnetic } from "../ui/units";
import { useAirspaceAlert } from "../ui/useAirspaceAlert";
import { useBasemap } from "../ui/useBasemap";
import { useMagVar } from "../ui/useMagVar";
import { useOwnship } from "../ui/useOwnship";

interface Props {
  planId?: string;
  /** The opened region pack (SQLite). null until downloaded/opened; the map and
   * HUD still work, only the airspace alert is inactive. */
  pack?: RegionPack | null;
}

export function FlyScreen({ planId, pack = null }: Props) {
  const [plan, setPlan] = useState<FlightPlan | undefined>();
  const [northUp, setNorthUp] = useState(true);
  const { ownship, permission } = useOwnship(true);
  const hits = useAirspaceAlert(pack, ownship);
  const magVar = useMagVar(pack, ownship);
  const basemap = useBasemap();

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = planId ? await fakeData.getFlightPlan(planId) : undefined;
      if (alive) setPlan(p);
    })();
    return () => { alive = false; };
  }, [planId]);

  const magHeading = ownship?.trackDeg != null
    ? trueToMagnetic(ownship.trackDeg, magVar)
    : null;

  return (
    <View style={styles.fill}>
      <AeroMap
        route={plan?.waypoints ?? []}
        ownship={ownship}
        northUp={northUp}
        basemapUri={basemap.uri}
      />
      <Hud
        ownship={ownship}
        magHeading={magHeading}
        northUp={northUp}
        onToggleOrientation={() => setNorthUp((v) => !v)}
      />
      {!ownship ? (
        <View style={styles.planBadge}>
          <Text style={styles.planText}>
            {permission === "denied" ? "Location off — plan mode" : "Acquiring GPS…"}
          </Text>
        </View>
      ) : null}
      {!basemap.loading && !basemap.uri ? (
        <View style={styles.importBox}>
          <Text style={styles.planText}>No base map — aero layers over neutral.</Text>
          <Button label="Import base map" variant="secondary" onPress={basemap.importBasemap} />
        </View>
      ) : null}
      <AirspaceBanner hits={hits} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.bg },
  planBadge: {
    position: "absolute", top: 72, alignSelf: "center",
    backgroundColor: color.surface, borderRadius: 999,
    paddingHorizontal: space[3], paddingVertical: space[1],
  },
  planText: { color: color.textMuted, fontSize: type.sm.fontSize },
  importBox: {
    position: "absolute", bottom: 120, alignSelf: "center",
    backgroundColor: color.surface, borderRadius: 12, padding: space[3],
    gap: space[2], alignItems: "center", borderWidth: 1, borderColor: color.border,
  },
});

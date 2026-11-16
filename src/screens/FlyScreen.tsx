import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { fakeData } from "../data/store";
import type { RegionPack } from "../data/pack";
import type { FlightPlan } from "../domain/types";
import { AeroMap } from "../ui/AeroMap";
import { AirspaceBanner } from "../ui/AirspaceBanner";
import { Hud } from "../ui/Hud";
import { color, space, type } from "../ui/theme";
import { trueToMagnetic } from "../ui/units";
import { useAirspaceAlert } from "../ui/useAirspaceAlert";
import { useMagVar } from "../ui/useMagVar";
import { useOwnship } from "../ui/useOwnship";

interface Props {
  planId?: string;
  /** The opened region pack (SQLite). null until downloaded/opened; the map and
   * HUD still work, only the airspace alert is inactive. */
  pack?: RegionPack | null;
  /** True once base_uruguay.pmtiles is on the device. */
  basemapAvailable?: boolean;
}

export function FlyScreen({ planId, pack = null, basemapAvailable = false }: Props) {
  const [plan, setPlan] = useState<FlightPlan | undefined>();
  const [northUp, setNorthUp] = useState(true);
  const { ownship, permission } = useOwnship(true);
  const hits = useAirspaceAlert(pack, ownship);
  const magVar = useMagVar(pack, ownship);

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
        basemapAvailable={basemapAvailable}
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
});

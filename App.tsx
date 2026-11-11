import React, { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { FlightPlan } from "./src/domain/types";
import { FlyScreen } from "./src/screens/FlyScreen";
import { PlanScreen } from "./src/screens/PlanScreen";
import { color, minTarget, space, type } from "./src/ui/theme";

type Tab = "plan" | "file" | "fly" | "log";
const TABS: { key: Tab; label: string }[] = [
  { key: "plan", label: "Plan" },
  { key: "file", label: "File" },
  { key: "fly", label: "Fly" },
  { key: "log", label: "Log" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("plan");
  const [activePlan, setActivePlan] = useState<FlightPlan | undefined>();

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={color.bg} />
      <View style={styles.content}>
        {tab === "plan" ? (
          <PlanScreen
            onPlanReady={(p) => {
              setActivePlan(p);
              setTab("fly");
            }}
          />
        ) : null}
        {tab === "fly" ? <FlyScreen planId={activePlan?.id} /> : null}
        {tab === "file" || tab === "log" ? (
          <View style={styles.stub}>
            <Text style={styles.stubText}>
              {tab === "file" ? "File" : "Log"} — coming in a later milestone.
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}
            accessibilityLabel={t.label}
            style={styles.tab}
          >
            <Text style={[styles.tabLabel, tab === t.key && styles.tabActive]}>
              {t.label}
            </Text>
            {tab === t.key ? <View style={styles.indicator} /> : null}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { flex: 1 },
  stub: { flex: 1, alignItems: "center", justifyContent: "center" },
  stubText: { color: color.textMuted, fontSize: type.base.fontSize },
  tabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
  },
  tab: { flex: 1, minHeight: minTarget + 8, alignItems: "center", justifyContent: "center", gap: space[1] },
  tabLabel: { color: color.textMuted, fontSize: type.sm.fontSize, fontWeight: "600" },
  tabActive: { color: color.text },
  indicator: { height: 3, width: 24, borderRadius: 999, backgroundColor: color.accent },
});

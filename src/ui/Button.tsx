import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { color, minTarget, radius, space, type } from "./theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

const bg: Record<Variant, string> = {
  primary: color.accent,
  secondary: color.surfaceRaised,
  ghost: "transparent",
  danger: color.danger,
};
const fg: Record<Variant, string> = {
  primary: color.onAccent,
  secondary: color.text,
  ghost: color.text,
  danger: color.onAccent,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  testID,
}: ButtonProps) {
  const isOff = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isOff}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isOff, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg[variant], opacity: isOff ? 0.5 : pressed ? 0.85 : 1 },
        variant === "secondary" && { borderWidth: 1, borderColor: color.border },
      ]}
    >
      <View style={styles.row}>
        {loading ? <ActivityIndicator color={fg[variant]} /> : null}
        <Text style={[styles.label, { color: fg[variant] }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTarget,
    borderRadius: radius.md,
    paddingHorizontal: space[5],
    justifyContent: "center",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: space[2] },
  label: { fontSize: type.sm.fontSize, fontWeight: "600" },
});

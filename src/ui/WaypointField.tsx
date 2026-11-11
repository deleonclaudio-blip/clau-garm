import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { searchAirports } from "../data/airports.uy";
import type { Airport } from "../domain/types";
import { color, minTarget, radius, space, type } from "./theme";

export interface WaypointFieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  onPick: (a: Airport) => void;
  invalid?: boolean;
  testID?: string;
}

/** A FastFind-style predictive airport field. Fresh behaviour, not Garmin's. */
export function WaypointField({
  label,
  value,
  onChangeText,
  onPick,
  invalid,
  testID,
}: WaypointFieldProps) {
  const [focused, setFocused] = useState(false);
  const matches = focused ? searchAirports(value) : [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} nativeID={`${testID}-label`}>
        {label}
      </Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ICAO or name"
        placeholderTextColor={color.textMuted}
        accessibilityLabel={label}
        aria-labelledby={`${testID}-label`}
        style={[
          styles.input,
          { borderColor: invalid ? color.danger : focused ? color.focusRing : color.borderInput },
        ]}
      />
      {invalid ? <Text style={styles.error}>No match. Check the identifier.</Text> : null}
      {matches.length > 0 ? (
        <FlatList
          style={styles.list}
          data={matches}
          keyExtractor={(a) => a.ident}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.ident} ${item.name ?? ""}`}
              style={styles.option}
            >
              <Text style={styles.ident}>{item.ident}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] },
  label: { color: color.textMuted, fontSize: type.xs.fontSize, fontWeight: "500" },
  input: {
    minHeight: minTarget,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space[3],
    color: color.text,
    backgroundColor: color.surface,
    fontSize: type.base.fontSize,
  },
  error: { color: color.danger, fontSize: type.xs.fontSize },
  list: {
    maxHeight: 200,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
  },
  option: {
    minHeight: minTarget,
    paddingHorizontal: space[3],
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  ident: { color: color.text, fontSize: type.base.fontSize, fontWeight: "600", width: 64 },
  name: { color: color.textMuted, fontSize: type.sm.fontSize, flexShrink: 1 },
});

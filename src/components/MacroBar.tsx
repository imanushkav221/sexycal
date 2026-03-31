import React from "react";
import { View, StyleSheet } from "react-native";

interface MacroBarProps {
  protein: number;
  fat: number;
  carbs: number;
  height?: number;
}

export default function MacroBar({
  protein,
  fat,
  carbs,
  height = 10,
}: MacroBarProps) {
  const total = protein * 4 + fat * 9 + carbs * 4;

  if (total === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={[styles.emptyBar, { height }]} />
      </View>
    );
  }

  const proteinPct = (protein * 4) / total;
  const fatPct = (fat * 9) / total;
  const carbsPct = (carbs * 4) / total;

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.segment,
          styles.proteinSegment,
          { flex: proteinPct, height },
        ]}
      />
      <View
        style={[
          styles.segment,
          styles.fatSegment,
          { flex: fatPct, height },
        ]}
      />
      <View
        style={[
          styles.segment,
          styles.carbsSegment,
          { flex: carbsPct, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  emptyBar: {
    flex: 1,
    backgroundColor: "#E5E7EB",
  },
  segment: {
    minWidth: 2,
  },
  proteinSegment: {
    backgroundColor: "#3B82F6", // blue
  },
  fatSegment: {
    backgroundColor: "#F59E0B", // amber
  },
  carbsSegment: {
    backgroundColor: "#10B981", // green
  },
});

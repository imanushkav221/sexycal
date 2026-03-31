import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  streak: number;
}

export default function StreakBadge({ streak }: Props) {
  if (streak === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Log a meal to start your streak!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.fireEmoji}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 4,
  },
  fireEmoji: {
    fontSize: 16,
  },
  count: {
    fontSize: 15,
    fontWeight: "800",
    color: "#92400E",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#B45309",
  },
  emptyContainer: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
});

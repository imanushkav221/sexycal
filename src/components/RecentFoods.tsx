import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import type { RecentFood } from "@/db/recentFoods";

interface Props {
  foods: RecentFood[];
  onQuickLog: (food: RecentFood) => void;
}

export default function RecentFoods({ foods, onQuickLog }: Props) {
  if (foods.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Log</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {foods.map((food) => (
          <TouchableOpacity
            key={food.id}
            style={styles.chip}
            onPress={() => onQuickLog(food)}
          >
            <Text style={styles.chipName} numberOfLines={1}>
              {food.name}
            </Text>
            <Text style={styles.chipCal}>{food.calories_kcal} kcal</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    maxWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  chipName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  chipCal: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "500",
  },
});

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import FoodItem from "./FoodItem";
import { deleteMealItem } from "@/db/mealItems";
import type { Meal } from "@/db/meals";
import type { MealItemWithFood } from "@/db/mealItems";

interface MealSectionProps {
  mealType: string;
  meal: Meal | null;
  items: MealItemWithFood[];
  onAddItem: () => void;
  onPhotoCapture: () => void;
  onItemDeleted?: () => void;
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function MealSection({
  mealType,
  meal,
  items,
  onAddItem,
  onPhotoCapture,
  onItemDeleted,
}: MealSectionProps) {
  const [expanded, setExpanded] = useState(true);

  const totalCalories = items.reduce((acc, i) => acc + i.calories_kcal, 0);

  const handleDelete = (itemId: string, foodName: string) => {
    Alert.alert(
      "Remove Item",
      `Remove "${foodName}" from ${MEAL_LABELS[mealType]}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMealItem(itemId);
              onItemDeleted?.();
            } catch (err) {
              console.error("[MealSection] Delete error:", err);
              Alert.alert("Error", "Failed to remove item.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{MEAL_EMOJIS[mealType] ?? "🍴"}</Text>
          <Text style={styles.mealLabel}>
            {MEAL_LABELS[mealType] ?? mealType}
          </Text>
          {items.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {totalCalories > 0 && (
            <Text style={styles.totalCalories}>{totalCalories} kcal</Text>
          )}
          <Text style={styles.chevron}>{expanded ? "▲" : "▼"}</Text>
        </View>
      </TouchableOpacity>

      {/* Items */}
      {expanded && (
        <View style={styles.itemsContainer}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No items logged yet</Text>
          ) : (
            items.map((item) => (
              <FoodItem
                key={item.id}
                name={item.food_name}
                brand={item.food_brand}
                calories={item.calories_kcal}
                protein={item.protein_g}
                fat={item.fat_g}
                carbs={item.carbs_g}
                servingSize={item.quantity_g}
                onPress={() => {}}
                showDelete
                onDelete={() => handleDelete(item.id, item.food_name)}
              />
            ))
          )}

          {/* Add buttons */}
          <View style={styles.addRow}>
            <TouchableOpacity style={styles.addBtn} onPress={onAddItem}>
              <Text style={styles.addBtnText}>+ Search Food</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.scanBtn} onPress={onPhotoCapture}>
              <Text style={styles.scanBtnText}>📸 Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: { fontSize: 18 },
  mealLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  totalCalories: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  chevron: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  itemsContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    paddingVertical: 12,
  },
  addRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  addBtn: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
  },
  addBtnText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
  scanBtn: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
  },
  scanBtnText: {
    color: "#16A34A",
    fontSize: 13,
    fontWeight: "500",
  },
});

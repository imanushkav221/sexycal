import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import MacroBar from "./MacroBar";

interface FoodItemProps {
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  servingSize: number;
  source?: string;
  onPress: () => void;
  showDelete?: boolean;
  onDelete?: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Custom",
  openfoodfacts: "OFF",
  usda: "USDA",
};

export default function FoodItem({
  name,
  brand,
  calories,
  protein,
  fat,
  carbs,
  servingSize,
  source,
  onPress,
  showDelete,
  onDelete,
}: FoodItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {source && SOURCE_LABELS[source] && (
              <View style={styles.sourceBadge}>
                <Text style={styles.sourceText}>{SOURCE_LABELS[source]}</Text>
              </View>
            )}
          </View>
          {brand ? (
            <Text style={styles.brand} numberOfLines={1}>
              {brand}
            </Text>
          ) : null}
          <View style={styles.macroRow}>
            <Text style={styles.macroText}>P: {protein}g</Text>
            <Text style={styles.macroSep}>·</Text>
            <Text style={styles.macroText}>F: {fat}g</Text>
            <Text style={styles.macroSep}>·</Text>
            <Text style={styles.macroText}>C: {carbs}g</Text>
            <Text style={styles.macroSep}>·</Text>
            <Text style={styles.servingText}>{servingSize}g serving</Text>
          </View>
          <View style={styles.barContainer}>
            <MacroBar protein={protein} fat={fat} carbs={carbs} height={4} />
          </View>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.calories}>{calories}</Text>
          <Text style={styles.kcalLabel}>kcal</Text>
          {showDelete && onDelete ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onDelete}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  sourceBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "500",
  },
  brand: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  macroText: {
    fontSize: 11,
    color: "#6B7280",
  },
  macroSep: {
    fontSize: 11,
    color: "#D1D5DB",
    marginHorizontal: 4,
  },
  servingText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  barContainer: {
    marginTop: 2,
  },
  rightCol: {
    alignItems: "center",
    minWidth: 48,
  },
  calories: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  kcalLabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  deleteBtn: {
    marginTop: 6,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
});

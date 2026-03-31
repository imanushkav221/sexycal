import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { getMealsForDate } from "@/db/meals";
import { getMealItemsWithFood } from "@/db/mealItems";
import { totalMacros } from "@/utils/nutrients";
import { useProfile } from "@/hooks/useProfile";
import { getLoggingStreak } from "@/db/streaks";
import { getRecentFoods, type RecentFood } from "@/db/recentFoods";
import { suggestMealType } from "@/utils/mealTime";
import MacroBar from "@/components/MacroBar";
import MealSection from "@/components/MealSection";
import StreakBadge from "@/components/StreakBadge";
import RecentFoods from "@/components/RecentFoods";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import type { Meal, MealType } from "@/db/meals";
import type { MealItemWithFood } from "@/db/mealItems";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

interface MealWithItems {
  meal: Meal;
  items: MealItemWithFood[];
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const { status: syncStatus, sync } = useSync();
  const { calorieGoal: CALORIE_GOAL, proteinGoal, fatGoal, carbsGoal, profile } = useProfile();
  const [mealsData, setMealsData] = useState<MealWithItems[]>([]);
  const [streak, setStreak] = useState(0);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = getTodayDate();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const meals = await getMealsForDate(user.id, today);
      const withItems: MealWithItems[] = await Promise.all(
        meals.map(async (meal) => ({
          meal,
          items: await getMealItemsWithFood(meal.id),
        }))
      );
      setMealsData(withItems);
      // Load streak and recent foods
      const [s, rf] = await Promise.all([
        getLoggingStreak(user.id).catch(() => 0),
        getRecentFoods(user.id, 8).catch(() => []),
      ]);
      setStreak(s);
      setRecentFoods(rf);
    } catch (err) {
      console.error("[HomeScreen] Load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await sync();
    await loadData();
  }, [sync, loadData]);

  const allItems = mealsData.flatMap((m) => m.items);
  const consumed = totalMacros(
    allItems.map((i) => ({
      calories_kcal: i.calories_kcal,
      protein_g: i.protein_g,
      fat_g: i.fat_g,
      carbs_g: i.carbs_g,
    }))
  );

  const caloriesRemaining = CALORIE_GOAL - consumed.calories_kcal;
  const progress = Math.min(consumed.calories_kcal / CALORIE_GOAL, 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={styles.loader} size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{formatDate(today)}</Text>
            <Text style={styles.greeting}>
              Hello, {profile?.display_name || user?.email?.split("@")[0] || "there"}!
            </Text>
          </View>
          {syncStatus === "syncing" ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <View
              style={[
                styles.syncDot,
                syncStatus === "offline" ? styles.syncDotOffline : styles.syncDotOnline,
              ]}
            />
          )}
        </View>

        {/* Streak + Photo */}
        <View style={styles.streakRow}>
          <StreakBadge streak={streak} />
          <TouchableOpacity
            style={styles.photoBtn}
            onPress={() => navigation.navigate("FoodPhoto")}
          >
            <Text style={styles.photoBtnText}>📸 Scan Food</Text>
          </TouchableOpacity>
        </View>

        {/* Calorie Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.calorieRow}>
            <View style={styles.calorieBlock}>
              <Text style={styles.calorieValue}>{consumed.calories_kcal}</Text>
              <Text style={styles.calorieLabel}>Consumed</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieBlock}>
              <Text style={styles.calorieValue}>{CALORIE_GOAL}</Text>
              <Text style={styles.calorieLabel}>Goal</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieBlock}>
              <Text
                style={[
                  styles.calorieValue,
                  caloriesRemaining < 0 && styles.calorieOver,
                ]}
              >
                {Math.abs(caloriesRemaining)}
              </Text>
              <Text style={styles.calorieLabel}>
                {caloriesRemaining >= 0 ? "Remaining" : "Over"}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: progress > 1 ? "#EF4444" : "#2563EB",
                },
              ]}
            />
          </View>

          {/* Macro breakdown */}
          <MacroBar
            protein={consumed.protein_g}
            fat={consumed.fat_g}
            carbs={consumed.carbs_g}
          />

          <View style={styles.macroLabels}>
            <Text style={styles.macroLabel}>
              P: {consumed.protein_g}g{proteinGoal ? ` / ${proteinGoal}g` : ""}
            </Text>
            <Text style={styles.macroLabel}>
              F: {consumed.fat_g}g{fatGoal ? ` / ${fatGoal}g` : ""}
            </Text>
            <Text style={styles.macroLabel}>
              C: {consumed.carbs_g}g{carbsGoal ? ` / ${carbsGoal}g` : ""}
            </Text>
          </View>
        </View>

        {/* Quick Log Recent Foods */}
        <RecentFoods
          foods={recentFoods}
          onQuickLog={(food) =>
            navigation.navigate("LogMeal", {
              foodId: food.id,
              foodName: food.name,
              foodBrand: food.brand,
              servingSizeG: food.serving_size_g,
              calories: food.calories_kcal,
              protein: food.protein_g,
              fat: food.fat_g,
              carbs: food.carbs_g,
              date: today,
              mealType: suggestMealType(),
            })
          }
        />

        {/* Meal Sections */}
        {MEAL_TYPES.map((mealType) => {
          const mealWithItems = mealsData.find(
            (m) => m.meal.meal_type === mealType
          );
          return (
            <MealSection
              key={mealType}
              mealType={mealType}
              meal={mealWithItems?.meal ?? null}
              items={mealWithItems?.items ?? []}
              onAddItem={() =>
                navigation.navigate("FoodSearch", {
                  date: today,
                  mealType,
                })
              }
              onPhotoCapture={() =>
                navigation.navigate("FoodPhoto")
              }
              onItemDeleted={loadData}
            />
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loader: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  syncDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  syncDotOnline: {
    backgroundColor: "#10B981",
  },
  syncDotOffline: {
    backgroundColor: "#F59E0B",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  calorieBlock: {
    alignItems: "center",
    flex: 1,
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  calorieOver: {
    color: "#EF4444",
  },
  calorieLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  calorieDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  macroLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  macroLabel: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  photoBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
});

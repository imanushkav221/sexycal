import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { calculateGoalsFromProfile } from "@/utils/tdee";
import type { Gender, ActivityLevel, FitnessGoal } from "@/utils/tdee";
import { useProfile } from "@/hooks/useProfile";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "OnboardingDone">;

const GOAL_LABELS: Record<string, string> = {
  lose: "Lose Weight",
  maintain: "Maintain Weight",
  gain: "Gain Muscle",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  active: "Active",
  very_active: "Very Active",
};

export default function OnboardingDoneScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { updateProfile } = useProfile();
  const [saving, setSaving] = useState(false);

  const { displayName, age, gender, heightCm, weightKg, activityLevel, fitnessGoal, goalWeightKg } =
    route.params;

  const goals = useMemo(
    () =>
      calculateGoalsFromProfile({
        weightKg: weightKg!,
        heightCm: heightCm!,
        age: age!,
        gender: gender as Gender,
        activityLevel: activityLevel as ActivityLevel,
        fitnessGoal: fitnessGoal as FitnessGoal,
      }),
    [weightKg, heightCm, age, gender, activityLevel, fitnessGoal]
  );

  const handleStart = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName ?? null,
        age: age ?? null,
        gender: (gender as Gender) ?? null,
        height_cm: heightCm ?? null,
        weight_kg: weightKg ?? null,
        activity_level: (activityLevel as ActivityLevel) ?? null,
        fitness_goal: (fitnessGoal as FitnessGoal) ?? null,
        goal_weight_kg: goalWeightKg ?? null,
        calorie_goal: goals.calorieGoal,
        protein_goal_g: goals.protein_g,
        fat_goal_g: goals.fat_g,
        carbs_goal_g: goals.carbs_g,
        onboarding_complete: 1,
      });

      // Reset navigation to Main so user can't go back to onboarding
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main" }],
        })
      );
    } catch (err) {
      console.error("[OnboardingDone] Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s === 5 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step 5 of 5</Text>

        <Text style={styles.title}>Your personalized{"\n"}plan is ready!</Text>
        <Text style={styles.subtitle}>
          Hi {displayName}! Based on your profile, here are your daily targets:
        </Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Age</Text>
            <Text style={styles.profileValue}>{age} years</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Height</Text>
            <Text style={styles.profileValue}>{heightCm} cm</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Weight</Text>
            <Text style={styles.profileValue}>{weightKg} kg</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Activity</Text>
            <Text style={styles.profileValue}>
              {ACTIVITY_LABELS[activityLevel ?? ""] ?? activityLevel}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Goal</Text>
            <Text style={styles.profileValue}>
              {GOAL_LABELS[fitnessGoal ?? ""] ?? fitnessGoal}
            </Text>
          </View>
          {goalWeightKg && (
            <>
              <View style={styles.divider} />
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Target Weight</Text>
                <Text style={styles.profileValue}>{goalWeightKg} kg</Text>
              </View>
            </>
          )}
        </View>

        {/* Calorie Goal */}
        <View style={styles.calorieCard}>
          <Text style={styles.calorieTitle}>Daily Calorie Goal</Text>
          <Text style={styles.calorieValue}>{goals.calorieGoal}</Text>
          <Text style={styles.calorieUnit}>kcal / day</Text>

          <View style={styles.macroRow}>
            <View style={styles.macroBlock}>
              <View style={[styles.macroColorDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={styles.macroValue}>{goals.protein_g}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroBlock}>
              <View style={[styles.macroColorDot, { backgroundColor: "#F59E0B" }]} />
              <Text style={styles.macroValue}>{goals.fat_g}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
            <View style={styles.macroBlock}>
              <View style={[styles.macroColorDot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.macroValue}>{goals.carbs_g}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
          </View>

          <View style={styles.tdeeRow}>
            <Text style={styles.tdeeLabel}>
              BMR: {goals.bmr} kcal | TDEE: {goals.tdee} kcal
            </Text>
          </View>
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startBtn, saving && styles.btnDisabled]}
          onPress={handleStart}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.startText}>Start Tracking!</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 24, paddingBottom: 40 },
  stepRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D1D5DB",
  },
  stepDotActive: {
    backgroundColor: "#2563EB",
    width: 24,
    borderRadius: 5,
  },
  stepLabel: {
    textAlign: "center",
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 24,
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
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  profileLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  profileValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  calorieCard: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  calorieTitle: {
    fontSize: 14,
    color: "#BFDBFE",
    fontWeight: "500",
    marginBottom: 4,
  },
  calorieValue: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  calorieUnit: {
    fontSize: 14,
    color: "#BFDBFE",
    marginBottom: 20,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 16,
  },
  macroBlock: {
    alignItems: "center",
  },
  macroColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  macroLabel: {
    fontSize: 12,
    color: "#BFDBFE",
    marginTop: 2,
  },
  tdeeRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 12,
    width: "100%",
    alignItems: "center",
  },
  tdeeLabel: {
    fontSize: 12,
    color: "#BFDBFE",
  },
  startBtn: {
    backgroundColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  startText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  backBtn: {
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  backText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "500",
  },
});

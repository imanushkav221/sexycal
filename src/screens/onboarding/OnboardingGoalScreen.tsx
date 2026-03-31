import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import type { FitnessGoal } from "@/utils/tdee";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "OnboardingGoal">;

const GOALS: { value: FitnessGoal; label: string; desc: string; icon: string }[] = [
  {
    value: "lose",
    label: "Lose Weight",
    desc: "Calorie deficit of ~500 kcal/day",
    icon: "📉",
  },
  {
    value: "maintain",
    label: "Maintain Weight",
    desc: "Eat at your maintenance level",
    icon: "⚖️",
  },
  {
    value: "gain",
    label: "Gain Muscle",
    desc: "Calorie surplus of ~300 kcal/day",
    icon: "📈",
  },
];

export default function OnboardingGoalScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { displayName, age, gender, heightCm, weightKg, activityLevel } =
    route.params;

  const [selected, setSelected] = useState<FitnessGoal | null>(null);
  const [goalWeightInput, setGoalWeightInput] = useState("");

  const handleNext = () => {
    if (!selected) {
      Alert.alert("Required", "Please select your fitness goal.");
      return;
    }

    const goalWeightKg =
      (selected === "lose" || selected === "gain") && goalWeightInput.trim()
        ? parseFloat(goalWeightInput)
        : undefined;

    if (goalWeightKg !== undefined && (isNaN(goalWeightKg) || goalWeightKg < 20 || goalWeightKg > 300)) {
      Alert.alert("Invalid Weight", "Please enter a valid goal weight (20–300 kg).");
      return;
    }

    navigation.navigate("OnboardingDone", {
      displayName,
      age,
      gender,
      heightCm,
      weightKg,
      activityLevel,
      fitnessGoal: selected,
      goalWeightKg,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s === 4 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step 4 of 5</Text>

        <Text style={styles.title}>What's your{"\n"}goal?</Text>
        <Text style={styles.subtitle}>
          We'll adjust your daily targets accordingly.
        </Text>

        {GOALS.map((goal) => (
          <TouchableOpacity
            key={goal.value}
            style={[
              styles.card,
              selected === goal.value && styles.cardActive,
            ]}
            onPress={() => setSelected(goal.value)}
          >
            <Text style={styles.cardIcon}>{goal.icon}</Text>
            <View style={styles.cardContent}>
              <Text
                style={[
                  styles.cardTitle,
                  selected === goal.value && styles.cardTitleActive,
                ]}
              >
                {goal.label}
              </Text>
              <Text style={styles.cardDesc}>{goal.desc}</Text>
            </View>
            <View
              style={[
                styles.radio,
                selected === goal.value && styles.radioActive,
              ]}
            >
              {selected === goal.value && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        {/* Goal weight input — shown for lose/gain goals */}
        {(selected === "lose" || selected === "gain") && (
          <View style={styles.goalWeightCard}>
            <Text style={styles.goalWeightLabel}>
              {selected === "lose" ? "What's your target weight?" : "What's your goal weight?"}
            </Text>
            <Text style={styles.goalWeightDesc}>Optional — helps track your progress</Text>
            <View style={styles.goalWeightRow}>
              <TextInput
                style={styles.goalWeightInput}
                value={goalWeightInput}
                onChangeText={setGoalWeightInput}
                placeholder="e.g. 70"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
                returnKeyType="done"
                maxLength={5}
              />
              <Text style={styles.goalWeightUnit}>kg</Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  cardTitleActive: {
    color: "#2563EB",
  },
  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: "#2563EB",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2563EB",
  },
  nextBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
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
  goalWeightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  goalWeightLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  goalWeightDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  goalWeightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalWeightInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  goalWeightUnit: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    width: 28,
  },
});

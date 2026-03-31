import React, { useState } from "react";
import {
  View,
  Text,
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
import type { ActivityLevel } from "@/utils/tdee";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "OnboardingActivity">;

const LEVELS: { value: ActivityLevel; label: string; desc: string; icon: string }[] = [
  {
    value: "sedentary",
    label: "Sedentary",
    desc: "Desk job, little or no exercise",
    icon: "🪑",
  },
  {
    value: "light",
    label: "Lightly Active",
    desc: "Light exercise 1-3 days/week",
    icon: "🚶",
  },
  {
    value: "moderate",
    label: "Moderately Active",
    desc: "Moderate exercise 3-5 days/week",
    icon: "🏃",
  },
  {
    value: "active",
    label: "Active",
    desc: "Hard exercise 6-7 days/week",
    icon: "💪",
  },
  {
    value: "very_active",
    label: "Very Active",
    desc: "Hard exercise + physical job",
    icon: "🔥",
  },
];

export default function OnboardingActivityScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { displayName, age, gender, heightCm, weightKg } = route.params;

  const [selected, setSelected] = useState<ActivityLevel | null>(null);

  const handleNext = () => {
    if (!selected) {
      Alert.alert("Required", "Please select your activity level.");
      return;
    }

    navigation.navigate("OnboardingGoal", {
      displayName,
      age,
      gender,
      heightCm,
      weightKg,
      activityLevel: selected,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s === 3 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step 3 of 5</Text>

        <Text style={styles.title}>How active{"\n"}are you?</Text>
        <Text style={styles.subtitle}>
          This helps determine how many calories you burn daily.
        </Text>

        {LEVELS.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.card,
              selected === level.value && styles.cardActive,
            ]}
            onPress={() => setSelected(level.value)}
          >
            <Text style={styles.cardIcon}>{level.icon}</Text>
            <View style={styles.cardContent}>
              <Text
                style={[
                  styles.cardTitle,
                  selected === level.value && styles.cardTitleActive,
                ]}
              >
                {level.label}
              </Text>
              <Text style={styles.cardDesc}>{level.desc}</Text>
            </View>
            <View
              style={[
                styles.radio,
                selected === level.value && styles.radioActive,
              ]}
            >
              {selected === level.value && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

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
});

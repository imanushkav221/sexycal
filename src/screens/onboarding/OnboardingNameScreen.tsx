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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import type { Gender } from "@/utils/tdee";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const GENDERS: { label: string; value: Gender }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

export default function OnboardingNameScreen() {
  const navigation = useNavigation<NavProp>();
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);

  const handleNext = () => {
    if (!displayName.trim()) {
      Alert.alert("Required", "Please enter your name.");
      return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      Alert.alert("Required", "Please enter a valid age (10-120).");
      return;
    }
    if (!gender) {
      Alert.alert("Required", "Please select your gender.");
      return;
    }

    navigation.navigate("OnboardingBody", {
      displayName: displayName.trim(),
      age: ageNum,
      gender,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s === 1 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step 1 of 5</Text>

        <Text style={styles.title}>Let's personalize{"\n"}your experience</Text>
        <Text style={styles.subtitle}>
          We'll use this to calculate your daily calorie goal.
        </Text>

        {/* Name */}
        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Abhishek"
          placeholderTextColor="#9CA3AF"
          autoFocus
        />

        {/* Age */}
        <Text style={styles.inputLabel}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="e.g. 25"
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
          maxLength={3}
        />

        {/* Gender */}
        <Text style={styles.inputLabel}>Gender</Text>
        <View style={styles.optionsRow}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[
                styles.optionBtn,
                gender === g.value && styles.optionBtnActive,
              ]}
              onPress={() => setGender(g.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  gender === g.value && styles.optionTextActive,
                ]}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Next</Text>
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
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },
  optionBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  optionBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  optionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  nextBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});

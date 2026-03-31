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

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "OnboardingBody">;

export default function OnboardingBodyScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { displayName, age, gender } = route.params;

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const handleNext = () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (!height || isNaN(h) || h < 50 || h > 300) {
      Alert.alert("Required", "Please enter a valid height (50-300 cm).");
      return;
    }
    if (!weight || isNaN(w) || w < 20 || w > 500) {
      Alert.alert("Required", "Please enter a valid weight (20-500 kg).");
      return;
    }

    navigation.navigate("OnboardingActivity", {
      displayName,
      age,
      gender,
      heightCm: h,
      weightKg: w,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Step indicator */}
        <View style={styles.stepRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <View key={s} style={[styles.stepDot, s === 2 && styles.stepDotActive]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>Step 2 of 5</Text>

        <Text style={styles.title}>Your body{"\n"}measurements</Text>
        <Text style={styles.subtitle}>
          This helps us accurately calculate your metabolic rate.
        </Text>

        {/* Height */}
        <Text style={styles.inputLabel}>Height (cm)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={height}
            onChangeText={setHeight}
            placeholder="e.g. 170"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
            autoFocus
          />
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>cm</Text>
          </View>
        </View>

        {/* Weight */}
        <Text style={styles.inputLabel}>Weight (kg)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={weight}
            onChangeText={setWeight}
            placeholder="e.g. 70"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
          <View style={styles.unitBadge}>
            <Text style={styles.unitText}>kg</Text>
          </View>
        </View>

        {/* Next */}
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
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
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
  },
  unitBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },
  unitText: {
    color: "#2563EB",
    fontWeight: "600",
    fontSize: 15,
  },
  nextBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
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

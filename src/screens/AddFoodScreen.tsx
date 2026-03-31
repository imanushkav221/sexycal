import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp, RouteProp } from "@react-navigation/native-stack";
import { createFood } from "@/db/foods";
import { useAuth } from "@/hooks/useAuth";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "AddFood">;

interface FormField {
  label: string;
  key: string;
  placeholder: string;
  keyboardType: "default" | "decimal-pad";
  required?: boolean;
}

const FIELDS: FormField[] = [
  { label: "Food Name *", key: "name", placeholder: "e.g. Brown Rice", keyboardType: "default", required: true },
  { label: "Brand", key: "brand", placeholder: "e.g. Trader Joe's", keyboardType: "default" },
  { label: "Barcode", key: "barcode", placeholder: "Optional", keyboardType: "default" },
  { label: "Serving Size (g) *", key: "serving_size_g", placeholder: "100", keyboardType: "decimal-pad", required: true },
  { label: "Calories (kcal) *", key: "calories_kcal", placeholder: "0", keyboardType: "decimal-pad", required: true },
  { label: "Protein (g)", key: "protein_g", placeholder: "0", keyboardType: "decimal-pad" },
  { label: "Fat (g)", key: "fat_g", placeholder: "0", keyboardType: "decimal-pad" },
  { label: "Carbs (g)", key: "carbs_g", placeholder: "0", keyboardType: "decimal-pad" },
];

export default function AddFoodScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();

  const prefill = route.params?.prefill ?? {};

  const [form, setForm] = useState<Record<string, string>>({
    name: "",
    brand: "",
    barcode: prefill.barcode ?? "",
    serving_size_g: "100",
    calories_kcal: "0",
    protein_g: "0",
    fat_g: "0",
    carbs_g: "0",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Food name is required.");
      return;
    }
    const servingSize = parseFloat(form.serving_size_g);
    if (!servingSize || servingSize <= 0) {
      Alert.alert("Error", "Please enter a valid serving size.");
      return;
    }

    setSaving(true);
    try {
      const saved = await createFood(
        {
          name: form.name.trim(),
          brand: form.brand.trim() || null,
          barcode: form.barcode.trim() || null,
          serving_size_g: servingSize,
          calories_kcal: parseFloat(form.calories_kcal) || 0,
          protein_g: parseFloat(form.protein_g) || 0,
          fat_g: parseFloat(form.fat_g) || 0,
          carbs_g: parseFloat(form.carbs_g) || 0,
          source: "manual",
          category: "Custom",
          user_id: user?.id ?? null,
        },
        user?.id
      );

      // Navigate to LogMeal with the saved food
      navigation.replace("LogMeal", {
        foodId: saved.id,
        foodName: saved.name,
        foodBrand: saved.brand,
        servingSizeG: saved.serving_size_g,
        calories: saved.calories_kcal,
        protein: saved.protein_g,
        fat: saved.fat_g,
        carbs: saved.carbs_g,
      });
    } catch (err) {
      console.error("[AddFood] Save error:", err);
      Alert.alert("Error", "Failed to save food. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Enter nutrition info per serving (per 100g recommended)
          </Text>

          {FIELDS.map((field) => (
            <View key={field.key} style={styles.inputGroup}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                style={styles.input}
                value={form[field.key]}
                onChangeText={(v) => handleChange(field.key, v)}
                placeholder={field.placeholder}
                placeholderTextColor="#9CA3AF"
                keyboardType={field.keyboardType}
                editable={!saving}
              />
            </View>
          ))}

          {/* Calorie estimate */}
          {(parseFloat(form.protein_g) > 0 ||
            parseFloat(form.fat_g) > 0 ||
            parseFloat(form.carbs_g) > 0) && (
            <View style={styles.estimateCard}>
              <Text style={styles.estimateTitle}>Calculated from macros:</Text>
              <Text style={styles.estimateValue}>
                {Math.round(
                  parseFloat(form.protein_g || "0") * 4 +
                    parseFloat(form.fat_g || "0") * 9 +
                    parseFloat(form.carbs_g || "0") * 4
                )}{" "}
                kcal
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save & Log Food</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#111827",
  },
  estimateCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  estimateTitle: { fontSize: 13, color: "#16A34A" },
  estimateValue: { fontSize: 16, fontWeight: "700", color: "#16A34A" },
  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { color: "#6B7280", fontSize: 15 },
});

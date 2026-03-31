import React, { useState, useCallback } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateMeal, type MealType } from "@/db/meals";
import { addMealItem } from "@/db/mealItems";
import { createFood } from "@/db/foods";
import { computeCalories } from "@/utils/nutrients";
import { suggestMealType } from "@/utils/mealTime";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "LogMeal">;

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export default function LogMealScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();

  const params = route.params ?? {};
  const {
    foodId,
    foodName = "Unknown Food",
    foodBrand,
    servingSizeG = 100,
    calories = 0,
    protein = 0,
    fat = 0,
    carbs = 0,
    date: paramDate,
    mealType: paramMealType,
  } = params;

  const [selectedMealType, setSelectedMealType] = useState<MealType>(
    (paramMealType as MealType) ?? suggestMealType()
  );
  const [quantityText, setQuantityText] = useState(String(servingSizeG));
  const [saving, setSaving] = useState(false);

  const quantity = parseFloat(quantityText) || 0;

  const baseMacros = {
    calories_kcal: calories,
    protein_g: protein,
    fat_g: fat,
    carbs_g: carbs,
  };

  const computed = computeCalories(baseMacros, quantity, servingSizeG);

  const handleSave = useCallback(async () => {
    if (!user) {
      Alert.alert("Error", "Missing user information.");
      return;
    }
    if (quantity <= 0) {
      Alert.alert("Error", "Please enter a valid quantity.");
      return;
    }

    setSaving(true);
    try {
      const date = paramDate ?? getTodayDate();
      const meal = await getOrCreateMeal(user.id, date, selectedMealType);

      // If no foodId (e.g. from photo recognition), create a food entry first
      let resolvedFoodId = foodId;
      if (!resolvedFoodId) {
        const newFood = await createFood({
          name: foodName,
          brand: foodBrand ?? null,
          barcode: null,
          serving_size_g: servingSizeG,
          calories_kcal: calories,
          protein_g: protein,
          fat_g: fat,
          carbs_g: carbs,
          source: "photo",
          user_id: user.id,
        }, user.id);
        resolvedFoodId = newFood.id;
      }

      await addMealItem(meal.id, resolvedFoodId, quantity, computed);
      navigation.goBack();
    } catch (err) {
      console.error("[LogMealScreen] Save error:", err);
      Alert.alert("Error", "Failed to log meal item. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [user, foodId, foodName, foodBrand, servingSizeG, calories, protein, fat, carbs, quantity, selectedMealType, computed, paramDate, navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Food info */}
          <View style={styles.foodCard}>
            <Text style={styles.foodName}>{foodName}</Text>
            {foodBrand ? (
              <Text style={styles.foodBrand}>{foodBrand}</Text>
            ) : null}
            <Text style={styles.servingInfo}>
              Base: {servingSizeG}g serving
            </Text>
          </View>

          {/* Quantity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity (grams)</Text>
            <TextInput
              style={styles.input}
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="decimal-pad"
              placeholder="100"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Meal Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meal Type</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_TYPES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.mealTypeBtn,
                    selectedMealType === value && styles.mealTypeBtnActive,
                  ]}
                  onPress={() => setSelectedMealType(value)}
                >
                  <Text
                    style={[
                      styles.mealTypeBtnText,
                      selectedMealType === value && styles.mealTypeBtnTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calorie Preview */}
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Nutrition Preview</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>
                  {computed.calories_kcal}
                </Text>
                <Text style={styles.previewLabel}>Cal</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>{computed.protein_g}g</Text>
                <Text style={styles.previewLabel}>Protein</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>{computed.fat_g}g</Text>
                <Text style={styles.previewLabel}>Fat</Text>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewValue}>{computed.carbs_g}g</Text>
                <Text style={styles.previewLabel}>Carbs</Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Log Food</Text>
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
  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  foodBrand: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  servingInfo: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  mealTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTypeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  mealTypeBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  mealTypeBtnText: {
    fontSize: 14,
    color: "#374151",
  },
  mealTypeBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  previewCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1D4ED8",
    marginBottom: 12,
    textAlign: "center",
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  previewItem: { alignItems: "center" },
  previewValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  previewLabel: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 15,
  },
});

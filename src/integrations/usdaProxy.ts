import { supabase } from "@/lib/supabase";
import { captureError } from "@/lib/sentry";
import type { Macros } from "@/utils/nutrients";

export interface USDAFoodItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

export interface FoodSearchResult {
  id: string;
  name: string;
  brand: string | null;
  serving_size_g: number;
  macros: Macros;
  source: "usda";
}

const NUTRIENT_IDS = {
  CALORIES: 1008,        // Energy (standard)
  CALORIES_GENERAL: 2047, // Energy (Atwater General Factors) — Foundation foods
  CALORIES_SPECIFIC: 2048, // Energy (Atwater Specific Factors) — Foundation foods
  CALORIES_KJ: 1062,     // Energy in kJ (some foods only have this)
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
};

function extractMacros(nutrients: USDANutrient[]): Macros {
  const getNutrientValue = (id: number): number => {
    const nutrient = nutrients.find((n) => n.nutrientId === id);
    return nutrient?.value ?? 0;
  };

  // Try standard Energy first, then Atwater General, then Atwater Specific, then kJ conversion
  let calories = getNutrientValue(NUTRIENT_IDS.CALORIES);
  if (calories === 0) calories = getNutrientValue(NUTRIENT_IDS.CALORIES_GENERAL);
  if (calories === 0) calories = getNutrientValue(NUTRIENT_IDS.CALORIES_SPECIFIC);
  if (calories === 0) {
    const kj = getNutrientValue(NUTRIENT_IDS.CALORIES_KJ);
    if (kj > 0) calories = Math.round(kj / 4.184);
  }

  return {
    calories_kcal: calories,
    protein_g: getNutrientValue(NUTRIENT_IDS.PROTEIN),
    fat_g: getNutrientValue(NUTRIENT_IDS.FAT),
    carbs_g: getNutrientValue(NUTRIENT_IDS.CARBS),
  };
}

function parseServingSizeG(
  servingSize?: number,
  servingSizeUnit?: string
): number {
  if (!servingSize) return 100;
  if (servingSizeUnit?.toLowerCase() === "g") return servingSize;
  if (servingSizeUnit?.toLowerCase() === "oz") return servingSize * 28.3495;
  if (servingSizeUnit?.toLowerCase() === "ml") return servingSize;
  return servingSize;
}

export async function searchUSDAFoods(
  query: string,
  pageSize = 20
): Promise<FoodSearchResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("usda-proxy", {
      body: { query, pageSize },
    });

    if (error) {
      captureError(error, { tags: { module: "usda-proxy" }, extra: { query } });
      return [];
    }

    const foods = (data?.foods as USDAFoodItem[]) ?? [];

    return foods.map((food) => ({
      id: String(food.fdcId),
      name: food.description,
      brand: food.brandOwner ?? null,
      serving_size_g: parseServingSizeG(food.servingSize, food.servingSizeUnit),
      macros: extractMacros(food.foodNutrients ?? []),
      source: "usda" as const,
    }));
  } catch (error) {
    captureError(error, { tags: { module: "usda-proxy" }, extra: { query } });
    return [];
  }
}

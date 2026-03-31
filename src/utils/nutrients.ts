export interface Macros {
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export function mapOffNutriments(nutriments: Record<string, unknown>): Macros {
  return {
    calories_kcal: Number(
      (nutriments["energy-kcal_100g"] as number | undefined) ??
        (nutriments["energy-kcal"] as number | undefined) ??
        0
    ),
    protein_g: Number(
      (nutriments["proteins_100g"] as number | undefined) ??
        (nutriments["proteins"] as number | undefined) ??
        0
    ),
    fat_g: Number(
      (nutriments["fat_100g"] as number | undefined) ??
        (nutriments["fat"] as number | undefined) ??
        0
    ),
    carbs_g: Number(
      (nutriments["carbohydrates_100g"] as number | undefined) ??
        (nutriments["carbohydrates"] as number | undefined) ??
        0
    ),
  };
}

export function computeCalories(
  macros: Macros,
  grams: number,
  servingSize: number
): Macros {
  const ratio = grams / (servingSize || 100);
  return {
    calories_kcal: Math.round(macros.calories_kcal * ratio),
    protein_g: Math.round(macros.protein_g * ratio * 10) / 10,
    fat_g: Math.round(macros.fat_g * ratio * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * ratio * 10) / 10,
  };
}

export function totalMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, item) => ({
      calories_kcal: acc.calories_kcal + item.calories_kcal,
      protein_g: Math.round((acc.protein_g + item.protein_g) * 10) / 10,
      fat_g: Math.round((acc.fat_g + item.fat_g) * 10) / 10,
      carbs_g: Math.round((acc.carbs_g + item.carbs_g) * 10) / 10,
    }),
    { calories_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0 }
  );
}

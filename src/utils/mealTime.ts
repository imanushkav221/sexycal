import type { MealType } from "@/db/meals";

export function suggestMealType(): MealType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "breakfast";
  if (hour >= 12 && hour < 17) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  if (hour >= 21 && hour < 24) return "snack";
  return "snack";
}

export interface MealWindow {
  mealType: MealType;
  label: string;
  startHour: number;
  endHour: number;
}

export const DEFAULT_MEAL_WINDOWS: MealWindow[] = [
  { mealType: "breakfast", label: "Breakfast", startHour: 6, endHour: 12 },
  { mealType: "lunch", label: "Lunch", startHour: 12, endHour: 17 },
  { mealType: "dinner", label: "Dinner", startHour: 17, endHour: 21 },
  { mealType: "snack", label: "Late Snack", startHour: 21, endHour: 24 },
];

export function getActiveMealWindow(): MealWindow | null {
  const hour = new Date().getHours();
  return DEFAULT_MEAL_WINDOWS.find(
    (w) => hour >= w.startHour && hour < w.endHour
  ) ?? null;
}

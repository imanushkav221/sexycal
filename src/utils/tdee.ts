export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal = 'lose' | 'maintain' | 'gain';
export type Gender = 'male' | 'female' | 'other';

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  // Mifflin-St Jeor equation
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78; // 'other' = average of male/female adjustment
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIER[activityLevel]);
}

export function calculateCalorieGoal(tdee: number, goal: FitnessGoal): number {
  if (goal === 'lose') return Math.round(tdee - 500);
  if (goal === 'gain') return Math.round(tdee + 300);
  return tdee;
}

export function calculateMacroGoals(calorieGoal: number, goal: FitnessGoal) {
  // Protein: 30% for lose/gain, 25% maintain
  // Fat: 25% for all
  // Carbs: remaining
  const proteinPct = goal === 'maintain' ? 0.25 : 0.30;
  const fatPct = 0.25;
  const carbsPct = 1 - proteinPct - fatPct;

  return {
    protein_g: Math.round((calorieGoal * proteinPct) / 4),
    fat_g: Math.round((calorieGoal * fatPct) / 9),
    carbs_g: Math.round((calorieGoal * carbsPct) / 4),
  };
}

export function calculateGoalsFromProfile(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
}) {
  const bmr = calculateBMR(params.weightKg, params.heightCm, params.age, params.gender);
  const tdee = calculateTDEE(bmr, params.activityLevel);
  const calorieGoal = calculateCalorieGoal(tdee, params.fitnessGoal);
  const macros = calculateMacroGoals(calorieGoal, params.fitnessGoal);
  return { bmr, tdee, calorieGoal, ...macros };
}

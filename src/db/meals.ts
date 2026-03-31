import { getDb } from "./migrate";
import { generateId } from "@/utils/uuid";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface Meal {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export async function createMeal(
  userId: string,
  date: string,
  mealType: MealType,
  notes?: string
): Promise<Meal> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO meals (id, user_id, date, meal_type, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, date, mealType, notes ?? null, now, now]
  );

  const meal = await getMealById(id);
  if (!meal) throw new Error("Failed to create meal");

  await db.runAsync(
    `INSERT INTO outbox (entity_type, entity_id, operation, payload) VALUES (?, ?, ?, ?)`,
    ["meal", id, "INSERT", JSON.stringify(meal)]
  );

  return meal;
}

export async function getMealById(id: string): Promise<Meal | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Meal>(
    "SELECT * FROM meals WHERE id = ?",
    [id]
  );
  return row ?? null;
}

export async function getMealsForDate(
  userId: string,
  date: string
): Promise<Meal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Meal>(
    `SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY created_at ASC`,
    [userId, date]
  );
  return rows;
}

export async function getMealsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Meal[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Meal>(
    `SELECT * FROM meals WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC, created_at ASC`,
    [userId, startDate, endDate]
  );
  return rows;
}

export async function getOrCreateMeal(
  userId: string,
  date: string,
  mealType: MealType
): Promise<Meal> {
  const db = await getDb();
  const existing = await db.getFirstAsync<Meal>(
    `SELECT * FROM meals WHERE user_id = ? AND date = ? AND meal_type = ? LIMIT 1`,
    [userId, date, mealType]
  );
  if (existing) return existing;
  return createMeal(userId, date, mealType);
}

export async function upsertMealFromRemote(meal: Meal): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO meals (id, user_id, date, meal_type, notes, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date,
       meal_type = excluded.meal_type,
       notes = excluded.notes,
       updated_at = excluded.updated_at,
       synced_at = excluded.synced_at`,
    [
      meal.id,
      meal.user_id,
      meal.date,
      meal.meal_type,
      meal.notes,
      meal.created_at,
      meal.updated_at,
      new Date().toISOString(),
    ]
  );
}

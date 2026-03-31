import { getDb } from "./migrate";
import { generateId } from "@/utils/uuid";

export interface MealItem {
  id: string;
  meal_id: string;
  food_id: string;
  quantity_g: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export interface MealItemWithFood extends MealItem {
  food_name: string;
  food_brand: string | null;
  food_serving_size_g: number;
}

export async function addMealItem(
  mealId: string,
  foodId: string,
  quantityG: number,
  macros: {
    calories_kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  }
): Promise<MealItem> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO meal_items (id, meal_id, food_id, quantity_g, calories_kcal, protein_g, fat_g, carbs_g, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      mealId,
      foodId,
      quantityG,
      macros.calories_kcal,
      macros.protein_g,
      macros.fat_g,
      macros.carbs_g,
      now,
      now,
    ]
  );

  const item = await getMealItemById(id);
  if (!item) throw new Error("Failed to create meal item");

  await db.runAsync(
    `INSERT INTO outbox (entity_type, entity_id, operation, payload) VALUES (?, ?, ?, ?)`,
    ["meal_item", id, "INSERT", JSON.stringify(item)]
  );

  return item;
}

export async function getMealItemById(id: string): Promise<MealItem | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<MealItem>(
    "SELECT * FROM meal_items WHERE id = ?",
    [id]
  );
  return row ?? null;
}

export async function getMealItemsWithFood(
  mealId: string
): Promise<MealItemWithFood[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MealItemWithFood>(
    `SELECT mi.*, f.name AS food_name, f.brand AS food_brand, f.serving_size_g AS food_serving_size_g
     FROM meal_items mi
     JOIN foods f ON mi.food_id = f.id
     WHERE mi.meal_id = ?
     ORDER BY mi.created_at ASC`,
    [mealId]
  );
  return rows;
}

export async function deleteMealItem(id: string): Promise<void> {
  const db = await getDb();

  const item = await getMealItemById(id);
  if (item) {
    await db.runAsync(
      `INSERT INTO outbox (entity_type, entity_id, operation, payload) VALUES (?, ?, ?, ?)`,
      ["meal_item", id, "DELETE", JSON.stringify({ id })]
    );
  }

  await db.runAsync("DELETE FROM meal_items WHERE id = ?", [id]);
}

export async function getDailyCaloriesByDate(
  userId: string,
  date: string
): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(mi.calories_kcal), 0) AS total
     FROM meal_items mi
     JOIN meals m ON mi.meal_id = m.id
     WHERE m.user_id = ? AND m.date = ?`,
    [userId, date]
  );
  return row?.total ?? 0;
}

export async function getDailyCaloriesForRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ date: string; total_calories: number }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string; total_calories: number }>(
    `SELECT m.date, COALESCE(SUM(mi.calories_kcal), 0) AS total_calories
     FROM meals m
     LEFT JOIN meal_items mi ON mi.meal_id = m.id
     WHERE m.user_id = ? AND m.date >= ? AND m.date <= ?
     GROUP BY m.date
     ORDER BY m.date ASC`,
    [userId, startDate, endDate]
  );
  return rows;
}

export async function upsertMealItemFromRemote(item: MealItem): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO meal_items (id, meal_id, food_id, quantity_g, calories_kcal, protein_g, fat_g, carbs_g, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       quantity_g = excluded.quantity_g,
       calories_kcal = excluded.calories_kcal,
       protein_g = excluded.protein_g,
       fat_g = excluded.fat_g,
       carbs_g = excluded.carbs_g,
       updated_at = excluded.updated_at,
       synced_at = excluded.synced_at`,
    [
      item.id,
      item.meal_id,
      item.food_id,
      item.quantity_g,
      item.calories_kcal,
      item.protein_g,
      item.fat_g,
      item.carbs_g,
      item.created_at,
      item.updated_at,
      new Date().toISOString(),
    ]
  );
}

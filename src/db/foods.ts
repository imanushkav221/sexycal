import { getDb } from "./migrate";
import { generateId } from "@/utils/uuid";
import type { Macros } from "@/utils/nutrients";

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  serving_size_g: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  source: string;
  user_id: string | null;
  category: string;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export type CreateFoodInput = Omit<
  Food,
  "id" | "created_at" | "updated_at" | "synced_at"
>;

export async function createFood(
  input: CreateFoodInput,
  userId?: string
): Promise<Food> {
  const db = await getDb();
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO foods (id, name, brand, barcode, serving_size_g, calories_kcal, protein_g, fat_g, carbs_g, source, user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.brand ?? null,
      input.barcode ?? null,
      input.serving_size_g,
      input.calories_kcal,
      input.protein_g,
      input.fat_g,
      input.carbs_g,
      input.source,
      userId ?? input.user_id ?? null,
      now,
      now,
    ]
  );

  // Add to outbox
  const food = await getFoodById(id);
  if (!food) throw new Error("Failed to create food");

  await db.runAsync(
    `INSERT INTO outbox (entity_type, entity_id, operation, payload) VALUES (?, ?, ?, ?)`,
    ["food", id, "INSERT", JSON.stringify(food)]
  );

  return food;
}

export async function getFoodById(id: string): Promise<Food | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Food>(
    "SELECT * FROM foods WHERE id = ?",
    [id]
  );
  return row ?? null;
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Food>(
    "SELECT * FROM foods WHERE barcode = ? LIMIT 1",
    [barcode]
  );
  return row ?? null;
}

export async function searchFoods(
  query: string,
  limit = 20,
  category?: string
): Promise<Food[]> {
  const db = await getDb();
  const like = `%${query}%`;

  if (category && category !== "All") {
    // Filter by category; include both user foods and system-seeded foods
    const rows = await db.getAllAsync<Food>(
      `SELECT * FROM foods
       WHERE (name LIKE ? OR brand LIKE ? OR category LIKE ?)
         AND (user_id = 'system' OR user_id IS NOT NULL)
         AND category = ?
       ORDER BY
         CASE WHEN user_id = 'system' THEN 1 ELSE 0 END,
         name
       LIMIT ?`,
      [like, like, like, category, limit]
    );
    return rows;
  }

  // No category filter — search user foods and system-seeded Indian foods
  const rows = await db.getAllAsync<Food>(
    `SELECT * FROM foods
     WHERE (name LIKE ? OR brand LIKE ? OR category LIKE ?)
       AND (user_id = 'system' OR user_id IS NOT NULL)
     ORDER BY
       CASE WHEN user_id = 'system' THEN 1 ELSE 0 END,
       name
     LIMIT ?`,
    [like, like, like, limit]
  );
  return rows;
}

export async function updateFood(
  id: string,
  updates: Partial<Macros & { name: string; brand: string; serving_size_g: number }>
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const fields = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = [...Object.values(updates), now, id];

  await db.runAsync(
    `UPDATE foods SET ${fields}, updated_at = ? WHERE id = ?`,
    values
  );

  const food = await getFoodById(id);
  if (food) {
    await db.runAsync(
      `INSERT INTO outbox (entity_type, entity_id, operation, payload) VALUES (?, ?, ?, ?)`,
      ["food", id, "UPDATE", JSON.stringify(food)]
    );
  }
}

export async function upsertFoodFromRemote(food: Food): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO foods (id, name, brand, barcode, serving_size_g, calories_kcal, protein_g, fat_g, carbs_g, source, user_id, created_at, updated_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       brand = excluded.brand,
       barcode = excluded.barcode,
       serving_size_g = excluded.serving_size_g,
       calories_kcal = excluded.calories_kcal,
       protein_g = excluded.protein_g,
       fat_g = excluded.fat_g,
       carbs_g = excluded.carbs_g,
       source = excluded.source,
       updated_at = excluded.updated_at,
       synced_at = excluded.synced_at`,
    [
      food.id,
      food.name,
      food.brand,
      food.barcode,
      food.serving_size_g,
      food.calories_kcal,
      food.protein_g,
      food.fat_g,
      food.carbs_g,
      food.source,
      food.user_id,
      food.created_at,
      food.updated_at,
      new Date().toISOString(),
    ]
  );
}

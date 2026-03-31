import { getDb } from "./migrate";

export interface RecentFood {
  id: string;
  name: string;
  brand: string | null;
  serving_size_g: number;
  calories_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  last_logged: string;
}

export async function getRecentFoods(
  userId: string,
  limit: number = 8
): Promise<RecentFood[]> {
  const db = await getDb();
  return db.getAllAsync<RecentFood>(
    `SELECT f.id, f.name, f.brand, f.serving_size_g, f.calories_kcal,
            f.protein_g, f.fat_g, f.carbs_g, MAX(mi.created_at) as last_logged
     FROM meal_items mi
     JOIN foods f ON mi.food_id = f.id
     JOIN meals m ON mi.meal_id = m.id
     WHERE m.user_id = ?
     GROUP BY f.id
     ORDER BY last_logged DESC
     LIMIT ?`,
    [userId, limit]
  );
}

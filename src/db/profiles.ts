import { getDb } from "./migrate";
import { generateId } from "@/utils/uuid";
import { supabase } from "@/lib/supabase";
import { captureError } from "@/lib/sentry";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  fitness_goal: 'lose' | 'maintain' | 'gain' | null;
  calorie_goal: number;
  protein_goal_g: number | null;
  fat_goal_g: number | null;
  carbs_goal_g: number | null;
  goal_weight_kg: number | null;
  onboarding_complete: number;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const db = await getDb();
  return db.getFirstAsync<Profile>(
    "SELECT * FROM profiles WHERE user_id = ?",
    [userId]
  );
}

export async function upsertProfile(
  userId: string,
  data: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'synced_at'>>
): Promise<Profile> {
  const db = await getDb();
  const existing = await getProfile(userId);
  const now = new Date().toISOString();

  if (existing) {
    const updates = { ...data, updated_at: now };
    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), existing.id];
    await db.runAsync(
      `UPDATE profiles SET ${setClauses} WHERE id = ?`,
      values
    );
    // Sync to Supabase directly
    const updatedProfile = await getProfile(userId);
    await syncProfileToSupabase(updatedProfile!);
    return updatedProfile!;
  } else {
    const id = generateId();
    const profile: Profile = {
      id,
      user_id: userId,
      display_name: null,
      age: null,
      gender: null,
      height_cm: null,
      weight_kg: null,
      activity_level: null,
      fitness_goal: null,
      calorie_goal: 2000,
      protein_goal_g: null,
      fat_goal_g: null,
      carbs_goal_g: null,
      goal_weight_kg: null,
      onboarding_complete: 0,
      created_at: now,
      updated_at: now,
      synced_at: null,
      ...data,
    };
    await db.runAsync(
      `INSERT INTO profiles (id, user_id, display_name, age, gender, height_cm, weight_kg,
        activity_level, fitness_goal, calorie_goal, protein_goal_g, fat_goal_g, carbs_goal_g,
        goal_weight_kg, onboarding_complete, created_at, updated_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [profile.id, profile.user_id, profile.display_name, profile.age, profile.gender,
       profile.height_cm, profile.weight_kg, profile.activity_level, profile.fitness_goal,
       profile.calorie_goal, profile.protein_goal_g, profile.fat_goal_g, profile.carbs_goal_g,
       profile.goal_weight_kg, profile.onboarding_complete, profile.created_at, profile.updated_at]
    );
    await syncProfileToSupabase(profile);
    return profile;
  }
}

async function syncProfileToSupabase(profile: Profile): Promise<void> {
  try {
    // Map local schema to Supabase schema: Supabase uses `id` as the user's auth ID (no separate user_id column)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { synced_at, id: _localId, user_id, ...rest } = profile;
    const payload = { id: user_id, ...rest };
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      captureError(error, { tags: { module: "profiles", action: "sync" }, extra: { userId: user_id, errorCode: error.code } });
    } else {
      const db = await getDb();
      await db.runAsync(
        "UPDATE profiles SET synced_at = ? WHERE id = ?",
        [new Date().toISOString(), profile.id]
      );
    }
  } catch (err) {
    captureError(err, { tags: { module: "profiles", action: "sync" } });
  }
}

export async function upsertProfileFromRemote(data: Profile): Promise<void> {
  const db = await getDb();
  const existing = await getProfile(data.user_id);
  if (existing && existing.updated_at >= data.updated_at) return;

  if (existing) {
    await db.runAsync(
      `UPDATE profiles SET display_name=?, age=?, gender=?, height_cm=?, weight_kg=?,
       activity_level=?, fitness_goal=?, calorie_goal=?, protein_goal_g=?, fat_goal_g=?,
       carbs_goal_g=?, goal_weight_kg=?, onboarding_complete=?, updated_at=?, synced_at=?
       WHERE id=?`,
      [data.display_name, data.age, data.gender, data.height_cm, data.weight_kg,
       data.activity_level, data.fitness_goal, data.calorie_goal, data.protein_goal_g,
       data.fat_goal_g, data.carbs_goal_g, data.goal_weight_kg, data.onboarding_complete,
       data.updated_at, data.synced_at, existing.id]
    );
  } else {
    await db.runAsync(
      `INSERT OR REPLACE INTO profiles (id, user_id, display_name, age, gender, height_cm,
       weight_kg, activity_level, fitness_goal, calorie_goal, protein_goal_g, fat_goal_g,
       carbs_goal_g, goal_weight_kg, onboarding_complete, created_at, updated_at, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id, data.user_id, data.display_name, data.age, data.gender, data.height_cm,
       data.weight_kg, data.activity_level, data.fitness_goal, data.calorie_goal,
       data.protein_goal_g, data.fat_goal_g, data.carbs_goal_g, data.goal_weight_kg,
       data.onboarding_complete, data.created_at, data.updated_at, data.synced_at]
    );
  }
}

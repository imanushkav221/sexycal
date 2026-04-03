import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getProfile, upsertProfile, upsertProfileFromRemote } from "@/db/profiles";
import { getDb } from "@/db/migrate";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/db/profiles";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      let p = await getProfile(user.id);

      // On a fresh install, SQLite is empty — pull from Supabase before rendering
      if (!p || p.onboarding_complete === 0) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data && data.onboarding_complete === 1) {
          // Map Supabase schema (id = auth user id) back to local schema
          const remoteProfile: Profile = {
            id: data.id,
            user_id: data.id,
            display_name: data.display_name,
            age: data.age,
            gender: data.gender,
            height_cm: data.height_cm,
            weight_kg: data.weight_kg,
            activity_level: data.activity_level,
            fitness_goal: data.fitness_goal,
            calorie_goal: data.calorie_goal ?? 2000,
            protein_goal_g: data.protein_goal_g,
            fat_goal_g: data.fat_goal_g,
            carbs_goal_g: data.carbs_goal_g,
            goal_weight_kg: data.goal_weight_kg,
            onboarding_complete: data.onboarding_complete,
            created_at: data.created_at,
            updated_at: data.updated_at,
            synced_at: data.updated_at,
          };
          await upsertProfileFromRemote(remoteProfile);
          // Force onboarding_complete=1 in case timestamp guard skipped the upsert
          const db = await getDb();
          await db.runAsync(
            "UPDATE profiles SET onboarding_complete = 1 WHERE user_id = ? AND onboarding_complete = 0",
            [user.id]
          );
          p = await getProfile(user.id);
        }
      }

      setProfile(p);
    } catch (err) {
      console.error("[useProfile] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(
    async (
      data: Partial<
        Omit<Profile, "id" | "user_id" | "created_at" | "updated_at" | "synced_at">
      >
    ) => {
      if (!user) return;
      const updated = await upsertProfile(user.id, data);
      setProfile(updated);
      return updated;
    },
    [user]
  );

  const calorieGoal = profile?.calorie_goal ?? 2000;
  const proteinGoal = profile?.protein_goal_g ?? null;
  const fatGoal = profile?.fat_goal_g ?? null;
  const carbsGoal = profile?.carbs_goal_g ?? null;
  const onboardingComplete = (profile?.onboarding_complete ?? 0) === 1;

  return {
    profile,
    loading,
    updateProfile,
    loadProfile,
    calorieGoal,
    proteinGoal,
    fatGoal,
    carbsGoal,
    onboardingComplete,
  };
}

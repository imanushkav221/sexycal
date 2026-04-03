import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getProfile, upsertProfile, upsertProfileFromRemote } from "@/db/profiles";
import { getDb } from "@/db/migrate";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Profile } from "@/db/profiles";

const ONBOARDING_FLAG = "@sexycal_onboarding_complete";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Always show spinner while loading profile
    setLoading(true);

    try {
      let p = await getProfile(user.id);

      // On a fresh install, SQLite is empty — pull from Supabase before rendering
      if (!p || p.onboarding_complete === 0) {
        // Quick check: did we already complete onboarding on this device?
        const flag = await AsyncStorage.getItem(ONBOARDING_FLAG);

        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (data && data.onboarding_complete === 1) {
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
          await AsyncStorage.setItem(ONBOARDING_FLAG, "1");
          p = await getProfile(user.id);
        } else if (flag === "1" && p) {
          // Supabase failed but we know onboarding was completed before
          const db = await getDb();
          await db.runAsync(
            "UPDATE profiles SET onboarding_complete = 1 WHERE user_id = ?",
            [user.id]
          );
          p = await getProfile(user.id);
        }
      } else {
        // Profile exists with onboarding_complete=1, ensure flag is set
        await AsyncStorage.setItem(ONBOARDING_FLAG, "1");
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
      // If onboarding was just completed, persist the flag
      if (data.onboarding_complete === 1) {
        await AsyncStorage.setItem(ONBOARDING_FLAG, "1");
      }
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

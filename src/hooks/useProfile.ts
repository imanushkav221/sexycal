import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getProfile, upsertProfile } from "@/db/profiles";
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
      const p = await getProfile(user.id);
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

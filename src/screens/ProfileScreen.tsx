import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/hooks/useAuth";
import { useSync } from "@/hooks/useSync";
import { useProfile } from "@/hooks/useProfile";
import { getDb } from "@/db/migrate";
import type { RootStackParamList } from "@/navigation/AppNavigator";

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  active: "Active",
  very_active: "Very Active",
};

const GOAL_LABELS: Record<string, string> = {
  lose: "Lose Weight",
  maintain: "Maintain Weight",
  gain: "Gain Muscle",
};

export default function ProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const { user, signOut, loading } = useAuth();
  const { status: syncStatus, lastSyncAt, sync } = useSync();
  const { profile, calorieGoal, proteinGoal, fatGoal, carbsGoal } = useProfile();
  const [exporting, setExporting] = useState(false);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const db = await getDb();
      const items = await db.getAllAsync<{
        date: string;
        meal_type: string;
        food_name: string;
        quantity_g: number;
        calories_kcal: number;
        protein_g: number;
        fat_g: number;
        carbs_g: number;
      }>(
        `SELECT m.date, m.meal_type, f.name as food_name,
                mi.quantity_g, mi.calories_kcal, mi.protein_g, mi.fat_g, mi.carbs_g
         FROM meal_items mi
         JOIN meals m ON mi.meal_id = m.id
         JOIN foods f ON mi.food_id = f.id
         WHERE m.user_id = ?
         ORDER BY m.date DESC, m.meal_type`,
        [user?.id ?? ""]
      );

      if (items.length === 0) {
        Alert.alert("No Data", "No meal data to export yet.");
        return;
      }

      const header = "Date,Meal,Food,Quantity(g),Calories,Protein(g),Fat(g),Carbs(g)";
      const rows = items.map((r) =>
        [
          r.date,
          r.meal_type,
          `"${r.food_name.replace(/"/g, '""')}"`,
          r.quantity_g,
          r.calories_kcal,
          r.protein_g,
          r.fat_g,
          r.carbs_g,
        ].join(",")
      );
      const csv = [header, ...rows].join("\n");

      await Share.share({
        message: csv,
        title: "Calorie Data Export",
      });
    } catch (err) {
      console.error("[Profile] Export error:", err);
      Alert.alert("Error", "Failed to export data.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Not Implemented",
              "Account deletion requires contacting support."
            );
          },
        },
      ]
    );
  };

  const syncStatusLabel: Record<string, string> = {
    idle: "Up to date",
    syncing: "Syncing...",
    error: "Sync error",
    offline: "Offline",
  };

  const syncStatusColor: Record<string, string> = {
    idle: "#10B981",
    syncing: "#2563EB",
    error: "#EF4444",
    offline: "#F59E0B",
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        {/* User Info */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name?.[0] ?? user?.email?.[0] ?? "U").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name ?? user?.email?.split("@")[0]}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Body Stats */}
        {profile && profile.onboarding_complete === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Stats</Text>
            <View style={styles.menuCard}>
              <View style={styles.menuRow}>
                <Text style={styles.menuLabel}>Age</Text>
                <Text style={styles.menuValue}>{profile.age ?? "-"} years</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.menuRow}>
                <Text style={styles.menuLabel}>Height</Text>
                <Text style={styles.menuValue}>{profile.height_cm ?? "-"} cm</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.menuRow}>
                <Text style={styles.menuLabel}>Weight</Text>
                <Text style={styles.menuValue}>{profile.weight_kg ?? "-"} kg</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.menuRow}>
                <Text style={styles.menuLabel}>Activity</Text>
                <Text style={styles.menuValue}>
                  {ACTIVITY_LABELS[profile.activity_level ?? ""] ?? "-"}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.menuRow}>
                <Text style={styles.menuLabel}>Goal</Text>
                <Text style={styles.menuValue}>
                  {GOAL_LABELS[profile.fitness_goal ?? ""] ?? "-"}
                </Text>
              </View>
              {profile.goal_weight_kg && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.menuRow}>
                    <Text style={styles.menuLabel}>Target Weight</Text>
                    <Text style={styles.menuValue}>{profile.goal_weight_kg} kg</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goals</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Text style={styles.menuLabel}>Calories</Text>
              <Text style={styles.menuValue}>{calorieGoal.toLocaleString()} kcal</Text>
            </View>
            {proteinGoal && (
              <>
                <View style={styles.divider} />
                <View style={styles.menuRow}>
                  <Text style={styles.menuLabel}>Protein</Text>
                  <Text style={styles.menuValue}>{proteinGoal}g</Text>
                </View>
              </>
            )}
            {fatGoal && (
              <>
                <View style={styles.divider} />
                <View style={styles.menuRow}>
                  <Text style={styles.menuLabel}>Fat</Text>
                  <Text style={styles.menuValue}>{fatGoal}g</Text>
                </View>
              </>
            )}
            {carbsGoal && (
              <>
                <View style={styles.divider} />
                <View style={styles.menuRow}>
                  <Text style={styles.menuLabel}>Carbs</Text>
                  <Text style={styles.menuValue}>{carbsGoal}g</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("WeightLog")}
            >
              <Text style={styles.actionText}>⚖️ Log Weight</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("OnboardingName")}
            >
              <Text style={styles.actionText}>✏️ Edit Profile / Recalculate Goals</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("EntertainmentReminder")}
            >
              <Text style={styles.actionText}>🔔 Smart Meal Reminders</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("FoodPhoto")}
            >
              <Text style={styles.actionText}>📸 Scan Food with Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sync Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Status</Text>
          <View style={styles.syncCard}>
            <View style={styles.syncRow}>
              <Text style={styles.syncLabel}>Status</Text>
              <View style={styles.syncStatusRow}>
                {syncStatus === "syncing" && (
                  <ActivityIndicator size="small" color="#2563EB" />
                )}
                <Text
                  style={[
                    styles.syncStatus,
                    { color: syncStatusColor[syncStatus] ?? "#111827" },
                  ]}
                >
                  {syncStatusLabel[syncStatus] ?? syncStatus}
                </Text>
              </View>
            </View>
            {lastSyncAt && (
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>Last Sync</Text>
                <Text style={styles.syncValue}>
                  {lastSyncAt.toLocaleTimeString()}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.syncBtn} onPress={sync}>
              <Text style={styles.syncBtnText}>Sync Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleExportData}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text style={styles.actionText}>📤 Export Data</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <View style={styles.menuRow}>
              <Text style={styles.menuLabel}>App Version</Text>
              <Text style={styles.menuValue}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutBtn, loading && styles.btnDisabled]}
          onPress={handleSignOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#EF4444" />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 16, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  displayName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "#6B7280",
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  syncCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  syncLabel: { fontSize: 14, color: "#374151" },
  syncStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncStatus: { fontSize: 14, fontWeight: "600" },
  syncValue: { fontSize: 14, color: "#6B7280" },
  syncBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
  },
  syncBtnText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 14, color: "#374151" },
  menuValue: { fontSize: 14, color: "#6B7280" },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: -14,
  },
  actionRow: {
    paddingVertical: 14,
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
  },
  signOutBtn: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  btnDisabled: { opacity: 0.6 },
  signOutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerZone: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 14,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  deleteBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 14,
  },
});

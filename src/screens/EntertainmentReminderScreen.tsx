import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { setupNotifications } from "@/lib/notifications";
import {
  ENTERTAINMENT_APPS,
  MEAL_REMINDERS,
  getEntertainmentSettings,
  saveEntertainmentSettings,
  scheduleMealReminders,
  type EntertainmentSettings,
} from "@/lib/entertainmentReminder";

export default function EntertainmentReminderScreen() {
  const [settings, setSettings] = useState<EntertainmentSettings>({
    enabled: false,
    selectedApps: [],
    enabledMeals: ["breakfast", "lunch", "dinner"],
    dailySummaryEnabled: true,
    dailySummaryHour: 21,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEntertainmentSettings().then(setSettings);
  }, []);

  const toggleEnabled = async (val: boolean) => {
    if (val) {
      const granted = await setupNotifications();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings to use this feature."
        );
        return;
      }
    }
    const updated = { ...settings, enabled: val };
    setSettings(updated);
    await saveEntertainmentSettings(updated);
    await scheduleMealReminders(updated);
  };

  const toggleApp = async (appId: string) => {
    const selected = settings.selectedApps.includes(appId)
      ? settings.selectedApps.filter((id) => id !== appId)
      : [...settings.selectedApps, appId];
    const updated = { ...settings, selectedApps: selected };
    setSettings(updated);
    await saveEntertainmentSettings(updated);
  };

  const toggleMeal = async (mealType: string) => {
    const meals = settings.enabledMeals.includes(mealType)
      ? settings.enabledMeals.filter((m) => m !== mealType)
      : [...settings.enabledMeals, mealType];
    const updated = { ...settings, enabledMeals: meals };
    setSettings(updated);
    await saveEntertainmentSettings(updated);
    await scheduleMealReminders(updated);
  };

  const toggleDailySummary = async (val: boolean) => {
    const updated = { ...settings, dailySummaryEnabled: val };
    setSettings(updated);
    await saveEntertainmentSettings(updated);
  };

  const testNotification = async () => {
    setSaving(true);
    try {
      const granted = await setupNotifications();
      if (!granted) {
        Alert.alert("Permission Required", "Enable notifications first.");
        return;
      }
      const { sendMealReminder } = await import("@/lib/notifications");
      const appNames = ENTERTAINMENT_APPS
        .filter((a) => settings.selectedApps.includes(a.id))
        .map((a) => a.name);
      const appName = appNames.length > 0 ? appNames[0] : undefined;
      await sendMealReminder("lunch", appName);
    } catch {
      Alert.alert("Error", "Failed to send test notification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Meal Reminders</Text>
        <Text style={styles.subtitle}>
          Get notified at meal times to log your food — even if you're watching something.
          Tap the notification to open the camera and log instantly.
        </Text>

        {/* Global Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Enable Meal Reminders</Text>
              <Text style={styles.toggleDesc}>
                Daily notifications at breakfast, lunch, and dinner time
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
              thumbColor={settings.enabled ? "#2563EB" : "#F3F4F6"}
            />
          </View>
        </View>

        {/* Meal Times */}
        <Text style={styles.sectionTitle}>Reminder Times</Text>
        <Text style={styles.sectionDesc}>
          Choose which meals to get reminded for.
        </Text>
        <View style={styles.card}>
          {MEAL_REMINDERS.map((meal, i) => (
            <React.Fragment key={meal.mealType}>
              <TouchableOpacity
                style={styles.appRow}
                onPress={() => toggleMeal(meal.mealType)}
                disabled={!settings.enabled}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.appName, !settings.enabled && styles.disabled]}>
                    {meal.label}
                  </Text>
                  <Text style={styles.timeText}>
                    {meal.defaultHour}:{String(meal.defaultMinute).padStart(2, "0")} daily
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    settings.enabledMeals.includes(meal.mealType) && styles.checkboxActive,
                    !settings.enabled && styles.disabled,
                  ]}
                >
                  {settings.enabledMeals.includes(meal.mealType) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
              {i < MEAL_REMINDERS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Entertainment Apps */}
        <Text style={styles.sectionTitle}>Your Apps</Text>
        <Text style={styles.sectionDesc}>
          Select apps you use during meals — we'll mention them in the notification to make it personal.
        </Text>
        <View style={styles.card}>
          {ENTERTAINMENT_APPS.map((app, i) => (
            <React.Fragment key={app.id}>
              <TouchableOpacity
                style={styles.appRow}
                onPress={() => toggleApp(app.id)}
                disabled={!settings.enabled}
              >
                <Text style={styles.appIcon}>{app.icon}</Text>
                <Text style={[styles.appName, !settings.enabled && styles.disabled]}>
                  {app.name}
                </Text>
                <View
                  style={[
                    styles.checkbox,
                    settings.selectedApps.includes(app.id) && styles.checkboxActive,
                    !settings.enabled && styles.disabled,
                  ]}
                >
                  {settings.selectedApps.includes(app.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
              {i < ENTERTAINMENT_APPS.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Daily Summary */}
        <Text style={styles.sectionTitle}>Daily Summary</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>End-of-Day Summary</Text>
              <Text style={styles.toggleDesc}>
                Daily notification at {settings.dailySummaryHour}:00 with your calorie recap
              </Text>
            </View>
            <Switch
              value={settings.dailySummaryEnabled}
              onValueChange={toggleDailySummary}
              trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
              thumbColor={settings.dailySummaryEnabled ? "#2563EB" : "#F3F4F6"}
            />
          </View>
        </View>

        {/* Test Button */}
        <TouchableOpacity
          style={[styles.testBtn, saving && { opacity: 0.6 }]}
          onPress={testNotification}
          disabled={saving}
        >
          <Text style={styles.testBtnText}>
            {saving ? "Sending..." : "Send Test Notification"}
          </Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Reminders fire at your set times every day — no need to open SexyCAL first.
            Just tap the notification to snap your food and log it instantly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 20, lineHeight: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600", color: "#6B7280",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16,
  },
  sectionDesc: { fontSize: 13, color: "#9CA3AF", marginBottom: 8, lineHeight: 18 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 14, paddingHorizontal: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  toggleLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  toggleDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  appRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  appIcon: { fontSize: 24, marginRight: 12 },
  appName: { flex: 1, fontSize: 15, color: "#111827" },
  timeText: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  divider: { height: 1, backgroundColor: "#F3F4F6" },
  testBtn: {
    backgroundColor: "#EFF6FF", borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "#BFDBFE",
  },
  testBtnText: { color: "#2563EB", fontSize: 15, fontWeight: "600" },
  infoBox: {
    backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: "#FDE68A",
  },
  infoText: { fontSize: 13, color: "#92400E", lineHeight: 18 },
});

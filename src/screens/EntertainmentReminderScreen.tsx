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
  getEntertainmentSettings,
  saveEntertainmentSettings,
  scheduleMealReminders,
  type EntertainmentSettings,
  type MealReminderTime,
} from "@/lib/entertainmentReminder";

function formatTime(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, "0");
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ampm}`;
}

function TimeAdjuster({
  meal,
  disabled,
  onChange,
}: {
  meal: MealReminderTime;
  disabled: boolean;
  onChange: (hour: number, minute: number) => void;
}) {
  const adjustHour = (delta: number) => {
    const newHour = (meal.hour + delta + 24) % 24;
    onChange(newHour, meal.minute);
  };
  const adjustMinute = (delta: number) => {
    let newMin = meal.minute + delta;
    if (newMin < 0) newMin = 45;
    if (newMin >= 60) newMin = 0;
    onChange(meal.hour, newMin);
  };

  return (
    <View style={[timeStyles.container, disabled && timeStyles.disabled]}>
      <View style={timeStyles.unit}>
        <TouchableOpacity onPress={() => adjustHour(1)} disabled={disabled} style={timeStyles.btn}>
          <Text style={timeStyles.arrow}>▲</Text>
        </TouchableOpacity>
        <Text style={timeStyles.value}>{String(meal.hour).padStart(2, "0")}</Text>
        <TouchableOpacity onPress={() => adjustHour(-1)} disabled={disabled} style={timeStyles.btn}>
          <Text style={timeStyles.arrow}>▼</Text>
        </TouchableOpacity>
      </View>
      <Text style={timeStyles.colon}>:</Text>
      <View style={timeStyles.unit}>
        <TouchableOpacity onPress={() => adjustMinute(15)} disabled={disabled} style={timeStyles.btn}>
          <Text style={timeStyles.arrow}>▲</Text>
        </TouchableOpacity>
        <Text style={timeStyles.value}>{String(meal.minute).padStart(2, "0")}</Text>
        <TouchableOpacity onPress={() => adjustMinute(-15)} disabled={disabled} style={timeStyles.btn}>
          <Text style={timeStyles.arrow}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const timeStyles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  disabled: { opacity: 0.4 },
  unit: { alignItems: "center", width: 36 },
  btn: { padding: 4 },
  arrow: { fontSize: 12, color: "#2563EB", fontWeight: "700" },
  value: { fontSize: 18, fontWeight: "700", color: "#111827", lineHeight: 24 },
  colon: { fontSize: 18, fontWeight: "700", color: "#111827", marginHorizontal: 2 },
});

export default function EntertainmentReminderScreen() {
  const [settings, setSettings] = useState<EntertainmentSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEntertainmentSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const save = async (updated: EntertainmentSettings) => {
    setSettings(updated);
    await saveEntertainmentSettings(updated);
    await scheduleMealReminders(updated);
  };

  const toggleEnabled = async (val: boolean) => {
    if (val) {
      const granted = await setupNotifications();
      if (!granted) {
        Alert.alert("Permission Required", "Please enable notifications in your device settings.");
        return;
      }
    }
    await save({ ...settings, enabled: val });
  };

  const toggleMeal = async (mealType: string) => {
    const mealTimes = settings.mealTimes.map((m) =>
      m.mealType === mealType ? { ...m, enabled: !m.enabled } : m
    );
    await save({ ...settings, mealTimes });
  };

  const updateMealTime = async (mealType: string, hour: number, minute: number) => {
    const mealTimes = settings.mealTimes.map((m) =>
      m.mealType === mealType ? { ...m, hour, minute } : m
    );
    await save({ ...settings, mealTimes });
  };

  const toggleApp = async (appId: string) => {
    const selected = settings.selectedApps.includes(appId)
      ? settings.selectedApps.filter((id) => id !== appId)
      : [...settings.selectedApps, appId];
    const updated = { ...settings, selectedApps: selected };
    setSettings(updated);
    await saveEntertainmentSettings(updated);
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
      if (!granted) { Alert.alert("Permission Required", "Enable notifications first."); return; }
      const { sendMealReminder } = await import("@/lib/notifications");
      const appNames = ENTERTAINMENT_APPS.filter((a) => settings.selectedApps.includes(a.id)).map((a) => a.name);
      await sendMealReminder("lunch", appNames[0]);
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
          Set your usual meal times and get reminded to log your food every day — no matter what app you're in.
        </Text>

        {/* Global Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Enable Meal Reminders</Text>
              <Text style={styles.toggleDesc}>Daily notifications at your chosen times</Text>
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
        <Text style={styles.sectionTitle}>Your Meal Times</Text>
        <Text style={styles.sectionDesc}>
          Set when you usually eat each meal. Toggle on the ones you want reminders for.
        </Text>
        <View style={styles.card}>
          {settings.mealTimes.map((meal, i) => (
            <React.Fragment key={meal.mealType}>
              <View style={styles.mealRow}>
                <TouchableOpacity
                  onPress={() => toggleMeal(meal.mealType)}
                  disabled={!settings.enabled}
                  style={styles.mealLeft}
                >
                  <View style={[
                    styles.checkbox,
                    meal.enabled && styles.checkboxActive,
                    !settings.enabled && styles.dimmed,
                  ]}>
                    {meal.enabled && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View>
                    <Text style={[styles.mealLabel, !settings.enabled && styles.dimmed]}>
                      {meal.icon} {meal.label}
                    </Text>
                    <Text style={styles.mealTime}>{formatTime(meal.hour, meal.minute)}</Text>
                  </View>
                </TouchableOpacity>
                <TimeAdjuster
                  meal={meal}
                  disabled={!settings.enabled || !meal.enabled}
                  onChange={(h, m) => updateMealTime(meal.mealType, h, m)}
                />
              </View>
              {i < settings.mealTimes.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Apps */}
        <Text style={styles.sectionTitle}>Your Apps (optional)</Text>
        <Text style={styles.sectionDesc}>
          We'll mention these in the notification text to make it feel personal.
        </Text>
        <View style={styles.card}>
          {ENTERTAINMENT_APPS.map((app, i) => (
            <React.Fragment key={app.id}>
              <TouchableOpacity style={styles.appRow} onPress={() => toggleApp(app.id)}>
                <Text style={styles.appIcon}>{app.icon}</Text>
                <Text style={styles.appName}>{app.name}</Text>
                <View style={[styles.checkbox, settings.selectedApps.includes(app.id) && styles.checkboxActive]}>
                  {settings.selectedApps.includes(app.id) && <Text style={styles.checkmark}>✓</Text>}
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
                Notification at {settings.dailySummaryHour}:00 with your calorie recap
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

        <TouchableOpacity
          style={[styles.testBtn, saving && { opacity: 0.6 }]}
          onPress={testNotification}
          disabled={saving}
        >
          <Text style={styles.testBtnText}>{saving ? "Sending..." : "Send Test Notification"}</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Set the time you usually eat — reminders fire daily at that time, no matter what app you're in. Tap the notification to snap your food and log instantly.
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
  mealRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingVertical: 14,
  },
  mealLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  mealLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  mealTime: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  appRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  appIcon: { fontSize: 22, marginRight: 12 },
  appName: { flex: 1, fontSize: 15, color: "#111827" },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  dimmed: { opacity: 0.4 },
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

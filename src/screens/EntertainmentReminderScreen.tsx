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
  type MealDeadline,
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
  meal: MealDeadline;
  disabled: boolean;
  onChange: (hour: number, minute: number) => void;
}) {
  const adjustHour = (delta: number) => onChange((meal.deadlineHour + delta + 24) % 24, meal.deadlineMinute);
  const adjustMinute = (delta: number) => {
    let m = meal.deadlineMinute + delta;
    if (m < 0) m = 45;
    if (m >= 60) m = 0;
    onChange(meal.deadlineHour, m);
  };

  return (
    <View style={[ts.container, disabled && ts.disabled]}>
      <View style={ts.unit}>
        <TouchableOpacity onPress={() => adjustHour(1)} disabled={disabled} style={ts.btn}>
          <Text style={ts.arrow}>▲</Text>
        </TouchableOpacity>
        <Text style={ts.value}>{String(meal.deadlineHour).padStart(2, "0")}</Text>
        <TouchableOpacity onPress={() => adjustHour(-1)} disabled={disabled} style={ts.btn}>
          <Text style={ts.arrow}>▼</Text>
        </TouchableOpacity>
      </View>
      <Text style={ts.colon}>:</Text>
      <View style={ts.unit}>
        <TouchableOpacity onPress={() => adjustMinute(15)} disabled={disabled} style={ts.btn}>
          <Text style={ts.arrow}>▲</Text>
        </TouchableOpacity>
        <Text style={ts.value}>{String(meal.deadlineMinute).padStart(2, "0")}</Text>
        <TouchableOpacity onPress={() => adjustMinute(-15)} disabled={disabled} style={ts.btn}>
          <Text style={ts.arrow}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
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
    const mealDeadlines = settings.mealDeadlines.map((m) =>
      m.mealType === mealType ? { ...m, enabled: !m.enabled } : m
    );
    await save({ ...settings, mealDeadlines });
  };

  const updateDeadline = async (mealType: string, hour: number, minute: number) => {
    const mealDeadlines = settings.mealDeadlines.map((m) =>
      m.mealType === mealType ? { ...m, deadlineHour: hour, deadlineMinute: minute } : m
    );
    await save({ ...settings, mealDeadlines });
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
          Set a deadline for each meal. If you haven't logged it by then, you'll get a nudge — regardless of when you actually ate.
        </Text>

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Enable Meal Reminders</Text>
              <Text style={styles.toggleDesc}>Reminds you if you forget to log</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
              thumbColor={settings.enabled ? "#2563EB" : "#F3F4F6"}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Remind me if not logged by...</Text>
        <Text style={styles.sectionDesc}>
          Set a cutoff time. If you ate at 12 or 2pm — doesn't matter. You'll only be reminded if you forgot.
        </Text>
        <View style={styles.card}>
          {settings.mealDeadlines.map((meal, i) => (
            <React.Fragment key={meal.mealType}>
              <View style={styles.mealRow}>
                <TouchableOpacity
                  onPress={() => toggleMeal(meal.mealType)}
                  disabled={!settings.enabled}
                  style={styles.mealLeft}
                >
                  <View style={[styles.checkbox, meal.enabled && styles.checkboxActive, !settings.enabled && styles.dimmed]}>
                    {meal.enabled && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View>
                    <Text style={[styles.mealLabel, !settings.enabled && styles.dimmed]}>
                      {meal.icon} {meal.label}
                    </Text>
                    <Text style={styles.deadlineHint}>
                      nudge at {formatTime(meal.deadlineHour, meal.deadlineMinute)}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TimeAdjuster
                  meal={meal}
                  disabled={!settings.enabled || !meal.enabled}
                  onChange={(h, m) => updateDeadline(meal.mealType, h, m)}
                />
              </View>
              {i < settings.mealDeadlines.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Your Apps (optional)</Text>
        <Text style={styles.sectionDesc}>Mentioned in the notification to make it feel personal.</Text>
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

        <Text style={styles.sectionTitle}>Daily Summary</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>End-of-Day Summary</Text>
              <Text style={styles.toggleDesc}>Calorie recap at {settings.dailySummaryHour}:00</Text>
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
            💡 You set a deadline — say 3pm for lunch. If you logged your lunch already, no notification. If you forgot, you get a nudge at 3pm to snap and log it.
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
  mealRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  mealLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  mealLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  deadlineHint: { fontSize: 12, color: "#6B7280", marginTop: 2 },
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

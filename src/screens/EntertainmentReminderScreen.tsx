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
  type EntertainmentSettings,
} from "@/lib/entertainmentReminder";
import { DEFAULT_MEAL_WINDOWS } from "@/utils/mealTime";

export default function EntertainmentReminderScreen() {
  const [settings, setSettings] = useState<EntertainmentSettings>({
    enabled: false,
    selectedApps: [],
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
      if (!granted) {
        Alert.alert("Permission Required", "Enable notifications first.");
        return;
      }
      const { sendMealReminder } = await import("@/lib/notifications");
      const appNames = ENTERTAINMENT_APPS
        .filter((a) => settings.selectedApps.includes(a.id))
        .map((a) => a.name);
      const appName = appNames.length > 0 ? appNames[0] : "Netflix";
      await sendMealReminder("lunch", appName);
      // No alert — so notification appears immediately as a banner
    } catch (err) {
      Alert.alert("Error", "Failed to send test notification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Smart Reminders</Text>
        <Text style={styles.subtitle}>
          Get a nudge to log your food whenever you leave SexyCAL during a meal window.
          Fires 5 seconds after you switch away — tap to log instantly.
        </Text>

        {/* Global Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Enable Meal Reminders</Text>
              <Text style={styles.toggleDesc}>
                Nudges you within seconds of leaving the app during a meal window
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

        {/* Entertainment Apps */}
        <Text style={styles.sectionTitle}>Entertainment Apps</Text>
        <Text style={styles.sectionDesc}>
          Select apps you use during meals. We'll send a meal logging reminder
          during breakfast, lunch, and dinner hours.
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
                <Text
                  style={[
                    styles.appName,
                    !settings.enabled && styles.disabled,
                  ]}
                >
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

        {/* Meal Windows */}
        <Text style={styles.sectionTitle}>Meal Windows</Text>
        <View style={styles.card}>
          {DEFAULT_MEAL_WINDOWS.map((w, i) => (
            <React.Fragment key={w.mealType}>
              <View style={styles.windowRow}>
                <Text style={styles.windowLabel}>{w.label}</Text>
                <Text style={styles.windowTime}>
                  {w.startHour}:00 – {w.endHour}:00
                </Text>
              </View>
              {i < DEFAULT_MEAL_WINDOWS.length - 1 && <View style={styles.divider} />}
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
            💡 A reminder fires 5 seconds after you leave SexyCAL during a meal window. The app name shown is just a random one from your list — we can't detect which app you opened. Come back to SexyCAL to cancel it.
          </Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDesc: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 8,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  toggleDesc: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  appIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  appName: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  windowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  windowLabel: {
    fontSize: 15,
    color: "#111827",
  },
  windowTime: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  testBtn: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  testBtnText: {
    color: "#2563EB",
    fontSize: 15,
    fontWeight: "600",
  },
  infoBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  infoText: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
  },
});

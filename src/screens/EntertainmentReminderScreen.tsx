import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  AppState,
  Linking,
  Platform,
  NativeModules,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { setupNotifications } from "@/lib/notifications";
import {
  ENTERTAINMENT_APPS,
  getEntertainmentSettings,
  saveEntertainmentSettings,
  type EntertainmentSettings,
} from "@/lib/entertainmentReminder";
import {
  hasUsagePermission,
  startWatching,
  stopWatching,
} from "app-detector";
import { DEFAULT_MEAL_WINDOWS } from "@/utils/mealTime";

/** Open Android's Usage Access settings — tries multiple approaches */
async function openUsageAccessSettings() {
  const errors: string[] = [];

  // Approach 1: expo-intent-launcher (dynamic import to avoid crash if missing)
  try {
    const IL = require("expo-intent-launcher");
    await IL.startActivityAsync("android.settings.USAGE_ACCESS_SETTINGS");
    return; // success
  } catch (e: any) {
    errors.push(`IntentLauncher: ${e?.message || e}`);
  }

  // Approach 2: Linking.sendIntent (Android-only RN API)
  try {
    await Linking.sendIntent("android.settings.USAGE_ACCESS_SETTINGS");
    return; // success
  } catch (e: any) {
    errors.push(`sendIntent: ${e?.message || e}`);
  }

  // Approach 3: General app settings
  try {
    await Linking.openSettings();
    return; // success
  } catch (e: any) {
    errors.push(`openSettings: ${e?.message || e}`);
  }

  // All failed — show manual instructions
  Alert.alert(
    "Open Settings Manually",
    "Go to: Settings > Apps > Special app access > Usage access\n\nFind SexyCAL and turn it ON.\n\n(Debug: " + errors.join("; ") + ")"
  );
}

export default function EntertainmentReminderScreen() {
  const [settings, setSettings] = useState<EntertainmentSettings>({
    enabled: false,
    selectedApps: [],
    dailySummaryEnabled: true,
    dailySummaryHour: 21,
  });
  const [hasPermission, setHasPermission] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshPermission = useCallback(() => {
    setHasPermission(hasUsagePermission());
  }, []);

  useEffect(() => {
    getEntertainmentSettings().then(setSettings);
    refreshPermission();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshPermission();
    });
    return () => sub.remove();
  }, [refreshPermission]);

  const toggleEnabled = async (val: boolean) => {
    if (val) {
      const notifGranted = await setupNotifications();
      if (!notifGranted) {
        Alert.alert("Permission Required", "Please enable notifications in device settings.");
        return;
      }
      if (!hasPermission) {
        Alert.alert(
          "Usage Access Required",
          'SexyCAL needs Usage Access to detect when you open Netflix, YouTube, etc.\n\nTap "Open Settings", find SexyCAL in the list, and turn it on.',
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => openUsageAccessSettings(),
            },
          ]
        );
        return;
      }
      startWatching(settings.selectedApps, DEFAULT_MEAL_WINDOWS);
    } else {
      stopWatching();
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
    if (settings.enabled && hasPermission) {
      startWatching(selected, DEFAULT_MEAL_WINDOWS);
    }
  };

  const toggleDailySummary = async (val: boolean) => {
    const updated = { ...settings, dailySummaryEnabled: val };
    setSettings(updated);
    await saveEntertainmentSettings(updated);
  };

  const testNotification = async () => {
    setSaving(true);
    try {
      const { sendMealReminder } = await import("@/lib/notifications");
      const appNames = ENTERTAINMENT_APPS
        .filter((a) => settings.selectedApps.includes(a.id))
        .map((a) => a.name);
      await sendMealReminder("lunch", appNames[0] || "YouTube");
    } catch {
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
          Get nudged to log food when you open entertainment apps during meal times. Works in the background automatically.
        </Text>

        {/* Permission banner — big and tappable */}
        {!hasPermission && (
          <TouchableOpacity
            style={styles.permBanner}
            onPress={() => openUsageAccessSettings()}
            activeOpacity={0.7}
          >
            <Text style={styles.permBannerTitle}>Step 1: Grant Usage Access</Text>
            <Text style={styles.permBannerDesc}>
              Tap here to open Settings. Find SexyCAL in the list and turn it ON. This lets the app detect when you open Netflix, YouTube, etc.
            </Text>
            <View style={styles.permBannerBtn}>
              <Text style={styles.permBannerBtnText}>Open Settings →</Text>
            </View>
          </TouchableOpacity>
        )}

        {hasPermission && (
          <View style={styles.permOk}>
            <Text style={styles.permOkText}>✓ Usage access granted</Text>
          </View>
        )}

        {/* Global Toggle */}
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>
                {hasPermission ? "Step 2: Enable Reminders" : "Enable Smart Reminders"}
              </Text>
              <Text style={styles.toggleDesc}>
                Detects entertainment apps during meal time and sends a reminder
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

        {/* Apps */}
        <Text style={styles.sectionTitle}>Watch These Apps</Text>
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

        {/* Meal Windows */}
        <Text style={styles.sectionTitle}>Active Meal Windows</Text>
        <View style={styles.card}>
          {DEFAULT_MEAL_WINDOWS.map((w, i) => (
            <React.Fragment key={w.mealType}>
              <View style={styles.windowRow}>
                <Text style={styles.windowLabel}>{w.label}</Text>
                <Text style={styles.windowTime}>{w.startHour}:00 – {w.endHour}:00</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  scroll: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 16, lineHeight: 20 },
  permBanner: {
    backgroundColor: "#FEF3C7", borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#FDE68A",
  },
  permBannerTitle: { fontSize: 16, fontWeight: "700", color: "#92400E", marginBottom: 6 },
  permBannerDesc: { fontSize: 13, color: "#92400E", lineHeight: 18, marginBottom: 10 },
  permBannerBtn: {
    backgroundColor: "#F59E0B", borderRadius: 8, paddingVertical: 10,
    paddingHorizontal: 16, alignSelf: "flex-start",
  },
  permBannerBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  permOk: {
    backgroundColor: "#F0FDF4", borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: "#BBF7D0",
  },
  permOkText: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  sectionTitle: {
    fontSize: 13, fontWeight: "600", color: "#6B7280",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 16,
  },
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
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: "#D1D5DB", justifyContent: "center", alignItems: "center",
  },
  checkboxActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkmark: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F3F4F6" },
  windowRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
  windowLabel: { fontSize: 15, color: "#111827" },
  windowTime: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  testBtn: {
    backgroundColor: "#EFF6FF", borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "#BFDBFE",
  },
  testBtnText: { color: "#2563EB", fontSize: 15, fontWeight: "600" },
});

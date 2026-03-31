import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, LogBox } from "react-native";

// expo-notifications warns about push tokens in Expo Go — we only use local notifications
LogBox.ignoreLogs(["expo-notifications: Android Push notifications"]);
import { SafeAreaProvider } from "react-native-safe-area-context";
import AppNavigator from "@/navigation/AppNavigator";
import { getDb } from "@/db/migrate";
import { runSync } from "@/sync/syncWorker";
import { seedIndianFoods } from "@/db/seedIndianFoods";
import { setupNotifications, scheduleDailySummary } from "@/lib/notifications";
import { initEntertainmentReminder, getEntertainmentSettings } from "@/lib/entertainmentReminder";

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDb()
      .then(async () => {
        await seedIndianFoods().catch(console.error);
        setDbReady(true);
        runSync().catch(console.error);
        // Auto-sync every 30 seconds
        const interval = setInterval(() => {
          runSync().catch(console.error);
        }, 30000);

        // Initialize notifications
        setupNotifications()
          .then(async (granted) => {
            if (granted) {
              // Schedule daily summary if enabled
              const settings = await getEntertainmentSettings();
              if (settings.dailySummaryEnabled) {
                await scheduleDailySummary(settings.dailySummaryHour);
              }
            }
          })
          .catch(console.error);

        // Initialize entertainment reminder (AppState-based)
        initEntertainmentReminder();

        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.error("[App] Failed to initialize DB:", err);
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
});

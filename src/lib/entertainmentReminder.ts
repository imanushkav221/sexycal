import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppStateStatus } from "react-native";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getActiveMealWindow } from "@/utils/mealTime";

const SETTINGS_KEY = "@entertainment_reminder_settings";
const LAST_REMINDER_KEY = "@last_entertainment_reminder";
const REMINDER_DELAY_SECONDS = 10; // 10 seconds — fires almost immediately when switching away

export interface EntertainmentApp {
  id: string;
  name: string;
  icon: string;
}

export const ENTERTAINMENT_APPS: EntertainmentApp[] = [
  { id: "youtube", name: "YouTube", icon: "📺" },
  { id: "netflix", name: "Netflix", icon: "🎬" },
  { id: "prime", name: "Prime Video", icon: "🎥" },
  { id: "hotstar", name: "Hotstar", icon: "⭐" },
  { id: "jiocinema", name: "JioCinema", icon: "🎞️" },
  { id: "disney", name: "Disney+", icon: "🏰" },
  { id: "spotify", name: "Spotify", icon: "🎵" },
  { id: "instagram", name: "Instagram", icon: "📷" },
];

export interface EntertainmentSettings {
  enabled: boolean;
  selectedApps: string[]; // app ids
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
}

const DEFAULT_SETTINGS: EntertainmentSettings = {
  enabled: false,
  selectedApps: [],
  dailySummaryEnabled: true,
  dailySummaryHour: 21,
};

export async function getEntertainmentSettings(): Promise<EntertainmentSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveEntertainmentSettings(
  settings: EntertainmentSettings
): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Track the scheduled notification so we can cancel it when the user returns
let pendingNotificationId: string | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

async function handleAppStateChange(nextState: AppStateStatus): Promise<void> {
  try {
    const settings = await getEntertainmentSettings();

    if (nextState === "background" || nextState === "inactive") {
      // App going to background — schedule a meal reminder if conditions are met
      if (!settings.enabled || settings.selectedApps.length === 0) return;

      const mealWindow = getActiveMealWindow();
      if (!mealWindow) return;

      // Don't remind twice for the same meal window today
      const lastReminder = await AsyncStorage.getItem(LAST_REMINDER_KEY);
      const today = new Date().toISOString().split("T")[0];
      const reminderKey = `${today}-${mealWindow.mealType}`;
      if (lastReminder === reminderKey) return;

      // Cancel any previously pending notification
      if (pendingNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(pendingNotificationId).catch(() => {});
        pendingNotificationId = null;
      }

      // Pick a random selected app name
      const selectedAppNames = ENTERTAINMENT_APPS
        .filter((a) => settings.selectedApps.includes(a.id))
        .map((a) => a.name);
      const randomApp =
        selectedAppNames[Math.floor(Math.random() * selectedAppNames.length)];

      pendingNotificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time to log your ${mealWindow.label.toLowerCase()}! 🍽️`,
          body: `Enjoying ${randomApp}? Don't forget to log what you're eating.`,
          data: { screen: "FoodSearch", mealType: mealWindow.mealType },
          ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: REMINDER_DELAY_SECONDS,
        },
      });

      await AsyncStorage.setItem(LAST_REMINDER_KEY, reminderKey);
    } else if (nextState === "active") {
      // App came back to foreground — cancel any pending reminder
      if (pendingNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(pendingNotificationId).catch(() => {});
        pendingNotificationId = null;
      }
    }
  } catch (err) {
    console.error("[EntertainmentReminder] AppState handler error:", err);
  }
}

export function initEntertainmentReminder(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
}

export function cleanupEntertainmentReminder(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

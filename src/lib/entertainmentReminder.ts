import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const SETTINGS_KEY = "@entertainment_reminder_settings";

export interface EntertainmentApp {
  id: string;
  name: string;
  icon: string;
}

export const ENTERTAINMENT_APPS: EntertainmentApp[] = [
  { id: "youtube", name: "YouTube", icon: "📺" },
  { id: "netflix", name: "Netflix", icon: "🎬" },
  { id: "prime", name: "Prime Video", icon: "🎥" },
  { id: "jiohotstar", name: "JioHotstar", icon: "⭐" },
  { id: "spotify", name: "Spotify", icon: "🎵" },
  { id: "instagram", name: "Instagram", icon: "📷" },
];

export interface MealReminderTime {
  mealType: "breakfast" | "lunch" | "dinner";
  label: string;
  icon: string;
  enabled: boolean;
  hour: number;
  minute: number;
}

export const DEFAULT_MEAL_TIMES: MealReminderTime[] = [
  { mealType: "breakfast", label: "Breakfast", icon: "🍳", enabled: false, hour: 8, minute: 30 },
  { mealType: "lunch", label: "Lunch", icon: "🥗", enabled: false, hour: 13, minute: 0 },
  { mealType: "dinner", label: "Dinner", icon: "🍽️", enabled: false, hour: 20, minute: 0 },
];

export interface EntertainmentSettings {
  enabled: boolean;
  selectedApps: string[];
  mealTimes: MealReminderTime[];
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
}

const DEFAULT_SETTINGS: EntertainmentSettings = {
  enabled: false,
  selectedApps: [],
  mealTimes: DEFAULT_MEAL_TIMES,
  dailySummaryEnabled: true,
  dailySummaryHour: 21,
};

export async function getEntertainmentSettings(): Promise<EntertainmentSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // Migrate old settings that don't have mealTimes
    if (!parsed.mealTimes) {
      parsed.mealTimes = DEFAULT_MEAL_TIMES;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveEntertainmentSettings(
  settings: EntertainmentSettings
): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function cancelMealReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content.data?.type === "meal-reminder") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function scheduleMealReminders(settings: EntertainmentSettings): Promise<void> {
  await cancelMealReminders();
  if (!settings.enabled) return;

  const appNames = ENTERTAINMENT_APPS
    .filter((a) => settings.selectedApps.includes(a.id))
    .map((a) => a.name);

  for (const meal of settings.mealTimes) {
    if (!meal.enabled) continue;

    const appHint = appNames.length > 0
      ? `Watching ${appNames[Math.floor(Math.random() * appNames.length)]}? `
      : "";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${meal.icon} Time to log your ${meal.label.toLowerCase()}!`,
        body: `${appHint}Snap a photo of your food to log it instantly.`,
        data: { type: "meal-reminder", screen: "FoodPhoto", mealType: meal.mealType },
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: meal.hour,
        minute: meal.minute,
      },
    });
  }
}

// No-op — kept for compatibility with App.tsx import
export function initEntertainmentReminder(): void {}
export function cleanupEntertainmentReminder(): void {}

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

export interface MealReminder {
  mealType: "breakfast" | "lunch" | "dinner";
  label: string;
  defaultHour: number;
  defaultMinute: number;
}

export const MEAL_REMINDERS: MealReminder[] = [
  { mealType: "breakfast", label: "Breakfast", defaultHour: 8, defaultMinute: 30 },
  { mealType: "lunch", label: "Lunch", defaultHour: 13, defaultMinute: 0 },
  { mealType: "dinner", label: "Dinner", defaultHour: 20, defaultMinute: 0 },
];

export interface EntertainmentSettings {
  enabled: boolean;
  selectedApps: string[];
  enabledMeals: string[]; // mealTypes that have reminders on
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
}

const DEFAULT_SETTINGS: EntertainmentSettings = {
  enabled: false,
  selectedApps: [],
  enabledMeals: ["breakfast", "lunch", "dinner"],
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

// Cancel all scheduled meal reminders
async function cancelMealReminders(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content.data?.type === "meal-reminder") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

// Schedule daily notifications at each enabled meal time
export async function scheduleMealReminders(settings: EntertainmentSettings): Promise<void> {
  await cancelMealReminders();

  if (!settings.enabled || settings.enabledMeals.length === 0) return;

  const appNames = ENTERTAINMENT_APPS
    .filter((a) => settings.selectedApps.includes(a.id))
    .map((a) => a.name);

  for (const meal of MEAL_REMINDERS) {
    if (!settings.enabledMeals.includes(meal.mealType)) continue;

    const appHint = appNames.length > 0
      ? `Watching ${appNames[Math.floor(Math.random() * appNames.length)]}? `
      : "";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time to log your ${meal.label.toLowerCase()}! 🍽️`,
        body: `${appHint}Snap a photo of your food to log it instantly.`,
        data: { type: "meal-reminder", screen: "FoodPhoto", mealType: meal.mealType },
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: meal.defaultHour,
        minute: meal.defaultMinute,
      },
    });
  }
}

// No-op — kept for compatibility with App.tsx import
export function initEntertainmentReminder(): void {}
export function cleanupEntertainmentReminder(): void {}

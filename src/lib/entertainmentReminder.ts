import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { getDb } from "@/db/migrate";

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

export interface MealDeadline {
  mealType: "breakfast" | "lunch" | "dinner";
  label: string;
  icon: string;
  enabled: boolean;
  deadlineHour: number;   // remind if not logged by this time
  deadlineMinute: number;
}

export const DEFAULT_MEAL_DEADLINES: MealDeadline[] = [
  { mealType: "breakfast", label: "Breakfast", icon: "🍳", enabled: false, deadlineHour: 10, deadlineMinute: 0 },
  { mealType: "lunch",     label: "Lunch",     icon: "🥗", enabled: false, deadlineHour: 15, deadlineMinute: 0 },
  { mealType: "dinner",    label: "Dinner",    icon: "🍽️", enabled: false, deadlineHour: 21, deadlineMinute: 0 },
];

export interface EntertainmentSettings {
  enabled: boolean;
  selectedApps: string[];
  mealDeadlines: MealDeadline[];
  dailySummaryEnabled: boolean;
  dailySummaryHour: number;
}

const DEFAULT_SETTINGS: EntertainmentSettings = {
  enabled: false,
  selectedApps: [],
  mealDeadlines: DEFAULT_MEAL_DEADLINES,
  dailySummaryEnabled: true,
  dailySummaryHour: 21,
};

export async function getEntertainmentSettings(): Promise<EntertainmentSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed.mealDeadlines) parsed.mealDeadlines = DEFAULT_MEAL_DEADLINES;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveEntertainmentSettings(settings: EntertainmentSettings): Promise<void> {
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

// Check if a meal type has already been logged today
async function isMealLoggedToday(mealType: string, userId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const today = new Date().toISOString().split("T")[0];
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM meals
       WHERE user_id = ? AND date = ? AND meal_type = ?`,
      [userId, today, mealType]
    );
    return (row?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function scheduleMealReminders(settings: EntertainmentSettings): Promise<void> {
  await cancelMealReminders();
  if (!settings.enabled) return;

  const appNames = ENTERTAINMENT_APPS
    .filter((a) => settings.selectedApps.includes(a.id))
    .map((a) => a.name);

  for (const meal of settings.mealDeadlines) {
    if (!meal.enabled) continue;

    const appHint = appNames.length > 0
      ? ` Watching ${appNames[Math.floor(Math.random() * appNames.length)]}?`
      : "";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${meal.icon} Did you log your ${meal.label.toLowerCase()}?`,
        body: `You haven't logged it yet.${appHint} Snap a photo now before you forget!`,
        data: { type: "meal-reminder", screen: "FoodPhoto", mealType: meal.mealType },
        ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: meal.deadlineHour,
        minute: meal.deadlineMinute,
      },
    });
  }
}

// Called when app opens — cancel reminders for meals already logged today
export async function cancelRemindersForLoggedMeals(userId: string): Promise<void> {
  try {
    const settings = await getEntertainmentSettings();
    if (!settings.enabled) return;

    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.type !== "meal-reminder") continue;
      const mealType = n.content.data?.mealType as string;
      if (await isMealLoggedToday(mealType, userId)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
        // Reschedule for tomorrow by re-running full schedule
      }
    }
  } catch {
    // non-fatal
  }
}

// No-op — kept for compatibility
export function initEntertainmentReminder(): void {}
export function cleanupEntertainmentReminder(): void {}

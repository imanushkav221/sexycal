import AsyncStorage from "@react-native-async-storage/async-storage";
import { startWatching, stopWatching, hasUsagePermission } from "app-detector";
import { DEFAULT_MEAL_WINDOWS } from "@/utils/mealTime";

const SETTINGS_KEY = "@entertainment_reminder_settings";

export interface EntertainmentApp {
  id: string;
  name: string;
  icon: string;
}

export const ENTERTAINMENT_APPS: EntertainmentApp[] = [
  { id: "youtube",    name: "YouTube",     icon: "📺" },
  { id: "netflix",    name: "Netflix",     icon: "🎬" },
  { id: "prime",      name: "Prime Video", icon: "🎥" },
  { id: "jiohotstar", name: "JioHotstar",  icon: "⭐" },
  { id: "spotify",    name: "Spotify",     icon: "🎵" },
  { id: "instagram",  name: "Instagram",   icon: "📷" },
];

export interface EntertainmentSettings {
  enabled: boolean;
  selectedApps: string[];
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

export async function saveEntertainmentSettings(settings: EntertainmentSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function initEntertainmentReminder(): void {
  getEntertainmentSettings().then((settings) => {
    if (settings.enabled && hasUsagePermission()) {
      startWatching(settings.selectedApps, DEFAULT_MEAL_WINDOWS);
    }
  }).catch(() => {});
}

export function cleanupEntertainmentReminder(): void {
  stopWatching();
}

// No-ops kept for compatibility
export async function scheduleMealReminders(): Promise<void> {}
export async function cancelRemindersForLoggedMeals(): Promise<void> {}

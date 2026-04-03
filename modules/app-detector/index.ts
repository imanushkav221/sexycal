import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

// Android package names for each app ID
export const APP_PACKAGES: Record<string, string> = {
  youtube:    "com.google.android.youtube",
  netflix:    "com.netflix.mediaclient",
  prime:      "com.amazon.avod.thirdpartyclient",
  jiohotstar: "in.startv.hotstar",
  spotify:    "com.spotify.music",
  instagram:  "com.instagram.android",
};

let Native: any = null;
if (Platform.OS === "android") {
  try {
    Native = requireNativeModule("AppDetector");
  } catch {
    // Will be null until native build
  }
}

export function hasUsagePermission(): boolean {
  return Native?.hasPermission() ?? false;
}

export function openPermissionSettings(): void {
  Native?.openPermissionSettings();
}

export function startWatching(
  appIds: string[],
  mealWindows: Array<{ mealType: string; label: string; startHour: number; endHour: number }>
): void {
  if (!Native) return;
  const packages = appIds.map((id) => APP_PACKAGES[id]).filter(Boolean);
  // Serialize meal windows as "mealType|label|startHour|endHour"
  const windowStrings = mealWindows.map(
    (w) => `${w.mealType}|${w.label}|${w.startHour}|${w.endHour}`
  );
  Native.startWatching(packages, windowStrings);
}

export function stopWatching(): void {
  Native?.stopWatching();
}

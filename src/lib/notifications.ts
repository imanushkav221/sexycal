import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("meal-reminders", {
      name: "Meal Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
    });

    await Notifications.setNotificationChannelAsync("daily-summary", {
      name: "Daily Summary",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
}

export async function sendMealReminder(
  mealType: string,
  appName?: string
): Promise<void> {
  const body = appName
    ? `Watching ${appName}? Don't forget to log your ${mealType}!`
    : `Time for ${mealType}! Don't forget to log what you eat.`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Log your ${mealType}`,
      body,
      data: { screen: "FoodSearch", mealType },
      ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
    },
    trigger: null, // immediate
  });
}

export async function scheduleDailySummary(
  hour: number = 21,
  minute: number = 0
): Promise<string> {
  // Cancel any existing daily summary
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === "daily-summary") {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Summary",
      body: "Tap to see how your nutrition tracked today!",
      data: { type: "daily-summary", screen: "Home" },
      ...(Platform.OS === "android" && { channelId: "daily-summary" }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return id;
}

export async function sendDelayedMealReminder(
  mealType: string,
  delaySec: number = 5,
  appName?: string
): Promise<void> {
  const body = appName
    ? `Watching ${appName}? Don't forget to log your ${mealType}! 🍽️`
    : `Time for ${mealType}! Don't forget to log what you eat. 🍽️`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 Log your ${mealType}`,
      body,
      data: { screen: "FoodSearch", mealType },
      ...(Platform.OS === "android" && { channelId: "meal-reminders" }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySec,
    },
  });
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

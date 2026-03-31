import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

import AuthScreen from "@/screens/AuthScreen";
import HomeScreen from "@/screens/HomeScreen";
import LogMealScreen from "@/screens/LogMealScreen";
import FoodSearchScreen from "@/screens/FoodSearchScreen";
import AddFoodScreen from "@/screens/AddFoodScreen";
import AnalyticsScreen from "@/screens/AnalyticsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import WeightLogScreen from "@/screens/WeightLogScreen";
import EntertainmentReminderScreen from "@/screens/EntertainmentReminderScreen";
import FoodPhotoScreen from "@/screens/FoodPhotoScreen";
import OnboardingNameScreen from "@/screens/onboarding/OnboardingNameScreen";
import OnboardingBodyScreen from "@/screens/onboarding/OnboardingBodyScreen";
import OnboardingActivityScreen from "@/screens/onboarding/OnboardingActivityScreen";
import OnboardingGoalScreen from "@/screens/onboarding/OnboardingGoalScreen";
import OnboardingDoneScreen from "@/screens/onboarding/OnboardingDoneScreen";
import type { FoodData as OFFFoodData } from "@/integrations/openFoodFacts";
import type { Gender } from "@/utils/tdee";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  FoodSearch: { mealId?: string; date?: string; mealType?: string };
  AddFood: { prefill?: Partial<OFFFoodData>; mealId?: string };
  LogMeal: {
    foodId?: string;
    foodName?: string;
    foodBrand?: string | null;
    servingSizeG?: number;
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    date?: string;
    mealType?: string;
  };
  WeightLog: undefined;
  EntertainmentReminder: undefined;
  FoodPhoto: undefined;
  OnboardingName: undefined;
  OnboardingBody: {
    displayName?: string;
    age?: number;
    gender?: Gender;
  };
  OnboardingActivity: {
    displayName?: string;
    age?: number;
    gender?: Gender;
    heightCm?: number;
    weightKg?: number;
  };
  OnboardingGoal: {
    displayName?: string;
    age?: number;
    gender?: Gender;
    heightCm?: number;
    weightKg?: number;
    activityLevel?: string;
  };
  OnboardingDone: {
    displayName?: string;
    age?: number;
    gender?: Gender;
    heightCm?: number;
    weightKg?: number;
    activityLevel?: string;
    fitnessGoal?: string;
    goalWeightKg?: number;
  };
};

export type TabParamList = {
  Home: undefined;
  Analytics: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: "🏠",
    Analytics: "📊",
    Profile: "👤",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[name] ?? "●"}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#6B7280",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { onboardingComplete, loading: profileLoading } = useProfile();

  if (authLoading || (session && profileLoading)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Determine initial route based on auth & onboarding status
  const initialRoute = !session
    ? "Auth"
    : !onboardingComplete
    ? "OnboardingName"
    : "Main";

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {!session ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            {/* Onboarding screens */}
            <Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
            <Stack.Screen
              name="OnboardingBody"
              component={OnboardingBodyScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OnboardingActivity"
              component={OnboardingActivityScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OnboardingGoal"
              component={OnboardingGoalScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OnboardingDone"
              component={OnboardingDoneScreen}
              options={{ headerShown: false }}
            />

            {/* Main app */}
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="FoodSearch"
              component={FoodSearchScreen}
              options={{
                headerShown: true,
                title: "Search Food",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="AddFood"
              component={AddFoodScreen}
              options={{
                headerShown: true,
                title: "Add Food",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="LogMeal"
              component={LogMealScreen}
              options={{
                headerShown: true,
                title: "Log Meal",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="WeightLog"
              component={WeightLogScreen}
              options={{
                headerShown: true,
                title: "Weight Log",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="EntertainmentReminder"
              component={EntertainmentReminderScreen}
              options={{
                headerShown: true,
                title: "Smart Reminders",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="FoodPhoto"
              component={FoodPhotoScreen}
              options={{
                headerShown: false,
                presentation: "fullScreenModal",
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

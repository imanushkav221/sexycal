# SexyCAL — Claude Context

## App Identity
- **Name:** SexyCAL (calorie tracking app)
- **Expo slug:** `sexycal` | **Bundle ID:** `com.sexycal.app`
- **EAS Project ID:** `66e18931-544e-41b1-a6e1-3c47f82d9890`
- **Expo account:** `imanushkav221`
- **GitHub:** https://github.com/imanushkav221/sexycal
- **Current version:** 1.0.2 (versionCode 2)

## Stack
- Expo SDK 54 / React Native 0.81.5 / TypeScript
- `expo-updates ~0.28.18` — must stay on 0.28.x for SDK 54 (55.x causes Gradle failures)
- `expo-intent-launcher ~13.0.8` — for opening Android settings
- Supabase: Postgres + Edge Functions (`food-recognize` via Gemini 2.5 Flash, `usda-proxy`)
- SQLite offline-first with Supabase sync (outbox pattern via `src/sync/`)
- EAS Build — `preview` profile, internal distribution (Android APK)

## Working Directory
`C:\Users\abhis\cal app\mobile` (this IS the git root)

## Git Identity (always use this)
```
git config user.name "imanushkav221"
git config user.email "imanushkav221@gmail.com"
```
Remote: `origin` → `https://github.com/imanushkav221/sexycal.git`
Local branch `master` → push to remote `main`: `git push origin master:main`

## Project Structure
```
src/
  screens/             # All screens (Home, FoodSearch, FoodPhoto, Profile, Analytics, etc.)
  screens/onboarding/  # Onboarding flow (Name, Body, Activity, Goal, Done)
  components/          # FoodItem, MealSection, MacroBar, RecentFoods, StreakBadge
  lib/                 # supabase.ts, notifications.ts, entertainmentReminder.ts
  db/                  # SQLite layer (foods, meals, mealItems, profiles, weightLogs, etc.)
  navigation/          # AppNavigator.tsx
  hooks/               # useAuth, useProfile, useSync
  utils/               # mealTime, tdee, nutrients, uuid
  sync/                # Supabase sync outbox pattern
modules/
  app-detector/        # Native Android module for foreground app detection
    android/src/main/java/expo/modules/appdetector/
      AppDetectorModule.kt   # Expo module interface
      AppDetectorService.kt  # Foreground service (polls UsageStatsManager)
      BootReceiver.kt        # Starts service on device boot
    android/src/main/AndroidManifest.xml  # Required for library module
    index.ts                 # JS interface
    plugin.js                # Config plugin (registers service, receiver, permissions)
supabase/
  functions/           # Edge Functions
  migrations/          # SQL migrations (current schema version: 4)
```

## Key Features
- **Food logging:** Photo capture → Gemini AI → auto-log calories
- **Smart reminders:** Native foreground service detects entertainment app usage during meal windows. User does NOT need to open SexyCAL first. Service auto-starts on boot via BootReceiver.
- **Entertainment apps:** YouTube, Netflix, Prime Video, JioHotstar, Spotify, Instagram
- **Onboarding:** Self-contained check in AppNavigator (AsyncStorage + direct Supabase query). Flag: `@sexycal_onboarding_complete`

## EAS Commands
```bash
eas build --platform android --profile preview --non-interactive  # native build (APK)
eas build:list --limit 3                                          # check build status
eas update --branch preview --message "description"               # OTA JS-only update (no reinstall needed)
```

## After Every Build
1. Update `README.md` with new APK link
2. Update GitHub repo About sidebar via API:
   ```bash
   TOKEN="<from git remote url>" && curl -s -X PATCH "https://api.github.com/repos/imanushkav221/sexycal" \
     -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
     -d '{"description":"SexyCAL - Smart calorie tracker. Download APK: <NEW_URL>","homepage":"<NEW_URL>"}'
   ```

## Common Issues
- `expo-updates` must be `~0.28.x` for SDK 54
- Git identity: always `imanushkav221` (NOT Anushka Verma, NOT Abhishek)
- Native module needs `android/src/main/AndroidManifest.xml` or APK fails to parse
- Don't use `foregroundServiceType="dataSync"` or `FOREGROUND_SERVICE_DATA_SYNC` — requires API 34
- For JS-only changes, use `eas update` instead of rebuilding

# SexyCAL — Claude Context

## App Identity
- **Name:** SexyCAL (calorie tracking app)
- **Expo slug:** `sexycal` | **Bundle ID:** `com.sexycal.app`
- **EAS Project ID:** `66e18931-544e-41b1-a6e1-3c47f82d9890`
- **Expo account:** `imanushkav221`
- **GitHub:** https://github.com/imanushkav221/sexycal

## Stack
- Expo SDK 54 / React Native 0.81.5 / TypeScript
- `expo-updates ~0.28.18` — must stay on 0.28.x for SDK 54 (55.x causes Gradle failures)
- Supabase: Postgres + Edge Functions (`food-recognize` via Gemini 2.5 Flash, `usda-proxy`)
- SQLite offline-first with Supabase sync (outbox pattern via `src/sync/`)
- EAS Build — `preview` profile, internal distribution (Android APK for friends)

## Working Directory
`C:\Users\abhis\cal app\mobile`

## Git Identity (always use this)
```
git config user.name "Anushka Verma"
git config user.email "imanushkav221@gmail.com"
```
Remote: `origin` → `https://github.com/imanushkav221/sexycal.git` (push to `main`)

## Project Structure
```
src/
  screens/          # All screens (Home, FoodSearch, FoodPhoto, Profile, Analytics, etc.)
  screens/onboarding/  # Onboarding flow (Goal, Activity, Done, etc.)
  components/       # FoodItem, MealSection, MacroBar, RecentFoods, StreakBadge
  lib/              # supabase.ts, notifications.ts, entertainmentReminder.ts
  db/               # SQLite layer (foods, meals, mealItems, profiles, weightLogs, etc.)
  navigation/       # AppNavigator.tsx
  hooks/            # useAuth, useProfile, useSync
  utils/            # mealTime, tdee, nutrients, uuid
  sync/             # Supabase sync outbox pattern
supabase/
  functions/        # Edge Functions
  migrations/       # SQL migrations (current schema version: 4)
```

## Key Features
- **Food logging:** Photo capture (no barcode scan) → Gemini AI recognizes food → logs calories
- **Smart reminders:** AppState listener fires notification 10s after leaving app during meal window
- **Entertainment apps:** User picks apps (YouTube, Netflix, etc.) that trigger meal reminders
- **Onboarding:** Collects name, age, weight, height, goal, activity level, goal weight
- **Analytics:** Charts for calories/weight over time
- **Data export:** CSV via native Share sheet (ProfileScreen)
- **OTA updates:** expo-updates, runtime version policy = appVersion

## SQLite Schema Version
Currently at **v4**. Migrations in `src/db/migrate.ts`. Latest addition: `goal_weight_kg` on `profiles` table.

## EAS Build Commands
```bash
eas build --platform android --profile preview --non-interactive  # build APK
eas build:list --limit 3                                          # check status
```

## Common Issues
- `expo-updates` version must match SDK — `~0.28.x` for SDK 54. Never use `^55.x`.
- Git config defaults to local machine identity — always set to Anushka Verma / imanushkav221@gmail.com before committing.

# SexyCAL 🍽️

A smart calorie tracking app for Android. Snap a photo of your food and let AI figure out the calories — no barcode scanning, no manual entry.

## Download

**[Download APK](https://expo.dev/artifacts/eas/atUcmFxt3vpMoJhy3xihvz.apk)** — Install directly on Android (no Play Store needed)

> Enable "Install from unknown sources" in Android settings if prompted.

## Features

- **AI food recognition** — take a photo, get instant calorie + macro breakdown powered by Gemini
- **Smart reminders** — get nudged to log your food within 10 seconds of switching to Netflix, YouTube, Instagram, etc. during meal times
- **Offline-first** — everything works without internet, syncs to cloud when connected
- **Goal tracking** — set your target weight and track progress
- **Analytics** — 7-day calorie and weight charts
- **Daily summary** — end-of-day notification with your calorie recap
- **Data export** — export your full history as CSV

## Stack

- Expo SDK 54 / React Native / TypeScript
- SQLite (offline-first) + Supabase (cloud sync)
- Gemini 2.5 Flash for food photo recognition
- EAS Build for APK distribution

## Development Setup

```bash
cd mobile
npm install
cp .env.example .env   # add your Supabase credentials
npm start
```

### Environment Variables

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Build APK

```bash
eas build --platform android --profile preview --non-interactive
```

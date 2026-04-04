import type { ExpoConfig } from "expo/config";

const APP_SLUG = "sexycal";
const IOS_BUNDLE_ID = "com.sexycal.app";
const ANDROID_PACKAGE = "com.sexycal.app";

export default (): ExpoConfig => ({
  name: "SexyCAL",
  slug: APP_SLUG,
  version: "1.0.0",
  orientation: "portrait",
  scheme: "sexycal",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    bundleIdentifier: IOS_BUNDLE_ID,
    supportsTablet: true,
  },
  android: {
    package: ANDROID_PACKAGE,
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },
  updates: {
    url: "https://u.expo.dev/66e18931-544e-41b1-a6e1-3c47f82d9890",
  },
  runtimeVersion: {
    policy: "appVersion",
  },
  plugins: [
    ["expo-camera", { cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to capture food photos." }],
    "expo-updates",
    "./modules/app-detector/plugin",
  ],
  extra: {
    eas: {
      projectId: "66e18931-544e-41b1-a6e1-3c47f82d9890",
    },
  },
});

const { withAndroidManifest } = require("@expo/config-plugins");

function withAppDetector(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    // Register the service
    if (!app.service) app.service = [];
    const serviceExists = app.service.some(
      (s) => s.$["android:name"] === "expo.modules.appdetector.AppDetectorService"
    );
    if (!serviceExists) {
      app.service.push({
        $: {
          "android:name": "expo.modules.appdetector.AppDetectorService",
          "android:exported": "false",
        },
      });
    }

    // FOREGROUND_SERVICE permission (needed to call startForeground)
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const fgExists = manifest.manifest["uses-permission"].some(
      (p) => p.$["android:name"] === "android.permission.FOREGROUND_SERVICE"
    );
    if (!fgExists) {
      manifest.manifest["uses-permission"].push({
        $: { "android:name": "android.permission.FOREGROUND_SERVICE" },
      });
    }

    // PACKAGE_USAGE_STATS — user grants this manually in Settings, no manifest entry needed
    // (removed to avoid any parsing issues on older Android versions)

    return config;
  });
}

module.exports = withAppDetector;

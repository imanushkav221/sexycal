const { withAndroidManifest } = require("@expo/config-plugins");

function withAppDetector(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    // --- Service ---
    if (!app.service) app.service = [];
    const serviceExists = app.service.some(
      (s) => s.$["android:name"] === "expo.modules.appdetector.AppDetectorService"
    );
    if (!serviceExists) {
      app.service.push({
        $: {
          "android:name": "expo.modules.appdetector.AppDetectorService",
          "android:exported": "false",
          "android:foregroundServiceType": "dataSync",
          "android:stopWithTask": "false",
        },
      });
    }

    // --- Permissions ---
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const perms = [
      "android.permission.PACKAGE_USAGE_STATS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_DATA_SYNC",
    ];
    perms.forEach((perm) => {
      const exists = manifest.manifest["uses-permission"].some(
        (p) => p.$["android:name"] === perm
      );
      if (!exists) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": perm } });
      }
    });

    return config;
  });
}

module.exports = withAppDetector;

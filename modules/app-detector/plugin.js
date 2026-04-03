const { withAndroidManifest } = require("@expo/config-plugins");

function withAppDetector(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    // Register the foreground service
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

    // Register the boot receiver — auto-starts service after reboot
    if (!app.receiver) app.receiver = [];
    const receiverExists = app.receiver.some(
      (r) => r.$["android:name"] === "expo.modules.appdetector.BootReceiver"
    );
    if (!receiverExists) {
      app.receiver.push({
        $: {
          "android:name": "expo.modules.appdetector.BootReceiver",
          "android:exported": "false",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.BOOT_COMPLETED" } }],
          },
        ],
      });
    }

    // Permissions
    if (!manifest.manifest["uses-permission"]) manifest.manifest["uses-permission"] = [];
    const addPermission = (name) => {
      const exists = manifest.manifest["uses-permission"].some(
        (p) => p.$["android:name"] === name
      );
      if (!exists) {
        manifest.manifest["uses-permission"].push({ $: { "android:name": name } });
      }
    };

    addPermission("android.permission.FOREGROUND_SERVICE");
    addPermission("android.permission.RECEIVE_BOOT_COMPLETED");

    return config;
  });
}

module.exports = withAppDetector;

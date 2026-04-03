package expo.modules.appdetector

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences("sexycal_app_detector", Context.MODE_PRIVATE)
        val enabled = prefs.getBoolean("enabled", false)
        if (!enabled) return

        val packages = prefs.getStringSet("targetPackages", emptySet()) ?: emptySet()
        val windows = prefs.getStringSet("mealWindows", emptySet()) ?: emptySet()
        if (packages.isEmpty()) return

        val serviceIntent = Intent(context, AppDetectorService::class.java).apply {
            putStringArrayListExtra("targetPackages", ArrayList(packages))
            putStringArrayListExtra("mealWindows", ArrayList(windows))
        }
        context.startService(serviceIntent)
    }
}

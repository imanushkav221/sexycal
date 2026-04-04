package expo.modules.appdetector

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppDetectorModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("AppDetector")

        Function("hasPermission") {
            return@Function hasUsagePermission()
        }

        Function("openPermissionSettings") {
            val context = appContext.reactContext ?: return@Function null
            try {
                val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                try {
                    val intent = Intent(Settings.ACTION_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                } catch (_: Exception) {}
            }
            return@Function null
        }

        Function("startWatching") { targetPackages: List<String>, mealWindowStrings: List<String> ->
            val context = appContext.reactContext ?: return@Function null

            val prefs = context.getSharedPreferences("sexycal_app_detector", Context.MODE_PRIVATE)
            prefs.edit()
                .putStringSet("targetPackages", targetPackages.toSet())
                .putStringSet("mealWindows", mealWindowStrings.toSet())
                .putBoolean("enabled", true)
                .apply()

            val intent = Intent(context, AppDetectorService::class.java).apply {
                putStringArrayListExtra("targetPackages", ArrayList(targetPackages))
                putStringArrayListExtra("mealWindows", ArrayList(mealWindowStrings))
            }
            context.startService(intent)
            return@Function null
        }

        Function("stopWatching") {
            val context = appContext.reactContext ?: return@Function null

            val prefs = context.getSharedPreferences("sexycal_app_detector", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("enabled", false).apply()

            context.stopService(Intent(context, AppDetectorService::class.java))
            return@Function null
        }
    }

    private fun hasUsagePermission(): Boolean {
        val context = appContext.reactContext ?: return false
        val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager
            ?: return false
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            appOps.unsafeCheckOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        } else {
            @Suppress("DEPRECATION")
            appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                Process.myUid(),
                context.packageName
            )
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }
}

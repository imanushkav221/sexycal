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
            hasUsagePermission()
        }

        Function("openPermissionSettings") {
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
        }

        Function("startWatching") { targetPackages: List<String>, mealWindowStrings: List<String> ->
            val context = appContext.reactContext ?: return@Function
            val intent = Intent(context, AppDetectorService::class.java).apply {
                putStringArrayListExtra("targetPackages", ArrayList(targetPackages))
                putStringArrayListExtra("mealWindows", ArrayList(mealWindowStrings))
            }
            context.startService(intent)
        }

        Function("stopWatching") {
            val context = appContext.reactContext ?: return@Function
            context.stopService(Intent(context, AppDetectorService::class.java))
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

package expo.modules.appdetector

import android.app.*
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.util.Calendar

class AppDetectorService : Service() {

    private val handler = Handler(Looper.getMainLooper())
    private val notifHandler = Handler(Looper.getMainLooper())

    private var targetPackages: List<String> = emptyList()
    private var mealWindows: List<Array<String>> = emptyList()
    private var notifScheduled = false
    private var lastTargetPkg: String? = null

    companion object {
        const val FOREGROUND_ID = 9001
        const val MEAL_NOTIF_ID = 9002
        const val FG_CHANNEL = "sexycal_service"
        const val MEAL_CHANNEL = "meal-reminders"
        const val POLL_MS = 2000L
        const val DELAY_MS = 5000L
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannels()
        startForeground(FOREGROUND_ID, buildForegroundNotif())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        intent?.let {
            targetPackages = it.getStringArrayListExtra("targetPackages") ?: emptyList()
            mealWindows = (it.getStringArrayListExtra("mealWindows") ?: emptyList())
                .map { s -> s.split("|").toTypedArray() }
        }
        handler.removeCallbacks(pollRunnable)
        handler.post(pollRunnable)
        return START_STICKY
    }

    override fun onDestroy() {
        handler.removeCallbacks(pollRunnable)
        notifHandler.removeCallbacksAndMessages(null)
        cancelMealNotif()
        super.onDestroy()
    }

    private val pollRunnable = object : Runnable {
        override fun run() {
            try { tick() } catch (_: Exception) {}
            handler.postDelayed(this, POLL_MS)
        }
    }

    private fun tick() {
        val meal = getActiveMeal()
        if (meal == null) {
            if (notifScheduled) cancelMealNotif()
            return
        }

        val fg = getForegroundPackage() ?: return
        val isTarget = targetPackages.any { fg.startsWith(it) || it.startsWith(fg) }

        if (isTarget && fg != lastTargetPkg) {
            lastTargetPkg = fg
            if (!notifScheduled) {
                notifScheduled = true
                notifHandler.postDelayed({
                    if (notifScheduled) showMealNotif(meal)
                }, DELAY_MS)
            }
        } else if (!isTarget && lastTargetPkg != null) {
            lastTargetPkg = null
            cancelMealNotif()
        }
    }

    private fun getForegroundPackage(): String? {
        val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return null
        val now = System.currentTimeMillis()
        val events = usm.queryEvents(now - 10_000L, now)
        val event = UsageEvents.Event()
        var last: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                last = event.packageName
            }
        }
        return last
    }

    private fun getActiveMeal(): Array<String>? {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return mealWindows.firstOrNull { w ->
            w.size >= 4 &&
            hour >= (w[2].toIntOrNull() ?: 0) &&
            hour < (w[3].toIntOrNull() ?: 0)
        }
    }

    private fun cancelMealNotif() {
        notifScheduled = false
        notifHandler.removeCallbacksAndMessages(null)
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .cancel(MEAL_NOTIF_ID)
    }

    private fun showMealNotif(meal: Array<String>) {
        val mealType = meal.getOrElse(0) { "meal" }
        val mealLabel = meal.getOrElse(1) { "Meal" }
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("navigateTo", "FoodPhoto")
            putExtra("mealType", mealType)
        }
        val pi = PendingIntent.getActivity(
            this, MEAL_NOTIF_ID, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notif = NotificationCompat.Builder(this, MEAL_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentTitle("🍽️ Log your ${mealLabel.lowercase()}!")
            .setContentText("Snap a photo of your food to log it instantly.")
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(MEAL_NOTIF_ID, notif)
    }

    private fun buildForegroundNotif(): Notification {
        val pi = PendingIntent.getActivity(
            this, 0,
            packageManager.getLaunchIntentForPackage(packageName),
            PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, FG_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentTitle("SexyCAL")
            .setContentText("Meal reminders active")
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .setOngoing(true)
            .build()
    }

    private fun createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(FG_CHANNEL, "SexyCAL Active", NotificationManager.IMPORTANCE_MIN)
                    .apply { setShowBadge(false); setSound(null, null) }
            )
            nm.createNotificationChannel(
                NotificationChannel(MEAL_CHANNEL, "Meal Reminders", NotificationManager.IMPORTANCE_HIGH)
            )
        }
    }
}

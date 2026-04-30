package com.minded.minded.sleepwinddown

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.minded.minded.MainActivity
import com.minded.minded.R

/**
 * Builds and posts the sleep wind-down notification. This is the single
 * surfacing primitive for the feature: both the unlock receiver and the
 * scheduled bedtime alarm fan in here.
 *
 * We use a high-importance channel + full-screen-intent so that:
 *   - if the device is locked, the system launches MainActivity directly
 *     (the wind-down route opens full-screen);
 *   - if the device is unlocked and in use, the notification appears as a
 *     heads-up that the user can tap to enter the wind-down.
 *
 * This avoids the Android 10+ background-activity-start (BAL) restriction
 * that would block a BroadcastReceiver from calling startActivity() directly.
 */
object SleepWindDownNotifier {
    const val CHANNEL_ID = "sleep_wind_down"
    private const val NOTIFICATION_ID = 6622
    const val EXTRA_OPEN_SLEEP_WIND_DOWN = "openSleepWindDown"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Sleep wind-down",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Gentle nudge to wind down for sleep at bedtime."
            setShowBadge(false)
            enableVibration(true)
        }
        nm.createNotificationChannel(channel)
    }

    fun show(context: Context) {
        ensureChannel(context)

        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(EXTRA_OPEN_SLEEP_WIND_DOWN, true)
        }
        val pi = PendingIntent.getActivity(
            context,
            NOTIFICATION_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Wind down for sleep?")
            .setContentText("Take a moment before bed.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .setFullScreenIntent(pi, true)

        try {
            val nm = context.getSystemService(NotificationManager::class.java) ?: return
            nm.notify(NOTIFICATION_ID, builder.build())
        } catch (e: SecurityException) {
            // Missing POST_NOTIFICATIONS runtime permission on Android 13+.
            // We can't recover here; the user must grant it from settings.
        }
    }

    fun cancel(context: Context) {
        val nm = context.getSystemService(NotificationManager::class.java) ?: return
        nm.cancel(NOTIFICATION_ID)
    }
}

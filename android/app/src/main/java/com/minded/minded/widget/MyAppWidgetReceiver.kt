package com.minded.minded.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar

/**
 * Receiver for the home-screen companion sun. The sun is a *living* anchor: it
 * tracks the day's light (dawn / day / dusk / moon), so it must refresh when the
 * phase turns over. Rather than polling, we arm a single inexact alarm for the
 * next phase boundary (≈4 wakeups a day) and re-arm each time it fires. The phase
 * itself is decided in MyAppWidget.provideGlance from the local hour.
 * See docs/sun-companion-widget.md.
 */
class MyAppWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MyAppWidget()

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == ACTION_REFRESH_SUN) {
            refreshAndReschedule(context)
            return
        }
        super.onReceive(context, intent)
    }

    // Fires on add, host request, and after reboot — a good moment to (re)arm.
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        scheduleNextPhaseChange(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        alarmManager(context)?.cancel(refreshPendingIntent(context))
    }

    private fun refreshAndReschedule(context: Context) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.Default).launch {
            try {
                MyAppWidget().updateAll(context)
            } finally {
                scheduleNextPhaseChange(context)
                pendingResult.finish()
            }
        }
    }

    private fun scheduleNextPhaseChange(context: Context) {
        val alarmManager = alarmManager(context) ?: return
        val now = Calendar.getInstance()
        val minutes = SunWidgetPhase.minutesUntilNextBoundary(
            now.get(Calendar.HOUR_OF_DAY),
            now.get(Calendar.MINUTE),
        )
        val triggerAt = System.currentTimeMillis() + minutes * 60_000L
        // Inexact + allow-while-idle: no SCHEDULE_EXACT_ALARM permission, and a
        // few minutes of drift is invisible on a sun that changes warmth, not time.
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC,
            triggerAt,
            refreshPendingIntent(context),
        )
    }

    private fun alarmManager(context: Context): AlarmManager? =
        context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

    private fun refreshPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MyAppWidgetReceiver::class.java).apply {
            action = ACTION_REFRESH_SUN
        }
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    companion object {
        private const val ACTION_REFRESH_SUN = "com.minded.minded.widget.ACTION_REFRESH_SUN"
    }
}

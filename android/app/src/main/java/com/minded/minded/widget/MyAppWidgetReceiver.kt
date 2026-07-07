package com.minded.minded.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar

/**
 * Receiver for the home-screen companion sun. The sun is a *living* anchor: it
 * tracks the day's light (the sun by day, the moon by night), and the wide card
 * carries a quiet line that turns over with the day's slots (WidgetPrompts), so
 * it must refresh at those boundaries. Rather than polling, we arm a single
 * inexact alarm for the next boundary (≈3 wakeups a day) and re-arm each time it
 * fires. What to show is decided in MyAppWidget.provideGlance from the local
 * hour. See docs/sun-companion-widget.md.
 */
class MyAppWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MyAppWidget()

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            // Our per-phase alarm, plus the clock/timezone changes that would
            // otherwise strand the sun on the wrong phase (manual clock set, DST,
            // travel). A reboot is covered by onUpdate — the host calls it when it
            // rebinds the widget after boot — so no BOOT_COMPLETED receiver (and
            // its permission) is needed.
            ACTION_REFRESH_SUN,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                refreshAndReschedule(context)
                return
            }
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
                glanceAppWidget.updateAll(context)
            } finally {
                scheduleNextPhaseChange(context)
                pendingResult.finish()
            }
        }
    }

    private fun scheduleNextPhaseChange(context: Context) {
        val alarmManager = alarmManager(context) ?: return
        // Only a placed sun needs refreshing. Without this guard a clock/timezone
        // change (delivered to the manifest receiver even with no widget on screen)
        // would arm a self-rescheduling alarm that ticks on forever — onDisabled, the
        // only canceller, never fires because onEnabled never did. Tie the alarm's
        // life to the sun's: bail and clear any stray alarm when none is placed.
        if (!hasPlacedWidget(context)) {
            alarmManager.cancel(refreshPendingIntent(context))
            return
        }
        val now = Calendar.getInstance()
        val hour = now.get(Calendar.HOUR_OF_DAY)
        val minute = now.get(Calendar.MINUTE)
        // Whichever changes first repaints the widget: the sun's day/night phase
        // or the card's prompt slot (the prompt boundaries are a superset today,
        // but keeping both explicit means neither can silently strand the other).
        val minutes = minOf(
            SunWidgetPhase.minutesUntilNextBoundary(hour, minute),
            WidgetPrompts.minutesUntilNextChange(hour, minute),
        )
        val triggerAt = System.currentTimeMillis() + minutes * 60_000L
        // Inexact + allow-while-idle: no SCHEDULE_EXACT_ALARM permission, and a few
        // minutes of drift is invisible on a sun that changes warmth, not time.
        // RTC, not RTC_WAKEUP: never wake the device to repaint a widget nobody is
        // looking at — an overdue phase change is delivered the moment the device
        // next wakes, i.e. right when someone glances at the phone.
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC,
            triggerAt,
            refreshPendingIntent(context),
        )
    }

    private fun alarmManager(context: Context): AlarmManager? =
        context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

    private fun hasPlacedWidget(context: Context): Boolean {
        val ids = AppWidgetManager.getInstance(context)
            ?.getAppWidgetIds(ComponentName(context, MyAppWidgetReceiver::class.java))
        return ids != null && ids.isNotEmpty()
    }

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

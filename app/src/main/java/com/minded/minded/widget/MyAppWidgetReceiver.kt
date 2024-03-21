package com.minded.minded.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import android.widget.RemoteViews
import android.widget.Toast
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import com.minded.minded.MainActivity

class MyAppWidgetReceiver : GlanceAppWidgetReceiver() {
    private val updateInterval = 30 * 60 * 1000L
//    private val updateInterval =  1000L
    override val glanceAppWidget: GlanceAppWidget = MyAppWidget()

    override fun onRestored(context: Context?, oldWidgetIds: IntArray?, newWidgetIds: IntArray?) {
        super.onRestored(context, oldWidgetIds, newWidgetIds)
        Log.d("MyAppWidgetReceiver", "onRestored called")
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("MyAppWidgetReceiver", "onEnabled called")

        // Create an Intent that targets the MyAppWidgetReceiver
        val intent = Intent(context, MyAppWidgetReceiver::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }

        // Wrap this Intent in a PendingIntent
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Get the AlarmManager service
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        alarmManager.setRepeating(
            AlarmManager.ELAPSED_REALTIME,
            SystemClock.elapsedRealtime() + updateInterval,
            updateInterval,
            pendingIntent
        )
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("MyAppWidgetReceiver", "onDisabled called")

        // Cancel the alarm when the last instance of the widget is removed
        val intent = Intent(context, MyAppWidgetReceiver::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
        }
        val pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.cancel(pendingIntent)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        Log.d("MyAppWidgetReceiver", "onUpdate called")
        Log.v("WR","onUpdate")
    }
}

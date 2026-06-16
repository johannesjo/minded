package com.minded.minded.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Receiver that hosts the [SunCompanionWidget]. Android refreshes it on its own
 * schedule (see `sun_companion_widget_info.xml`); the app can also push an
 * immediate refresh after sync-data changes via [SunCompanionWidget.updateAll].
 */
class SunCompanionWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SunCompanionWidget()
}

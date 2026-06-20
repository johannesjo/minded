package com.minded.minded.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Receiver for the home-screen companion sun. The sun is static (day/night is a
 * resource qualifier, not a live update), so there is nothing to poll — no alarm,
 * no periodic refresh. Glance handles layout on add/restore via provideGlance.
 */
class MyAppWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MyAppWidget()
}

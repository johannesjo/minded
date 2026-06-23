package com.minded.minded.widget

import android.content.Context
import android.content.Intent
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.size
import com.minded.minded.MainActivity
import com.minded.minded.R
import java.util.Calendar

/**
 * The home-screen companion sun: a calm, living anchor that tracks the day's
 * natural light — the warm sun by day, the cool moon at night. It carries no
 * metrics, badge, or anything to grade; it just reflects where you actually are
 * in the day (present-moment, never a stale timestamp).
 * Tapping it launches the app and opens the same sun interaction as tapping the
 * in-app dashboard companion. It is presence and invitation, never an interrupt.
 *
 * The phase is chosen from the local hour; MyAppWidgetReceiver arms one alarm per
 * phase change to refresh it. See docs/sun-companion-widget.md.
 */
class MyAppWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val phase = SunWidgetPhase.forHour(Calendar.getInstance().get(Calendar.HOUR_OF_DAY))
        provideContent {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .clickable(actionStartActivity(openSunIntent(context))),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    provider = ImageProvider(drawableFor(phase)),
                    contentDescription = context.getString(descriptionFor(phase)),
                    modifier = GlanceModifier.size(72.dp),
                )
            }
        }
    }

    private fun drawableFor(phase: SunWidgetPhase): Int = when (phase) {
        SunWidgetPhase.DAY -> R.drawable.ic_sun_widget_day
        SunWidgetPhase.NIGHT -> R.drawable.ic_sun_widget_night
    }

    private fun descriptionFor(phase: SunWidgetPhase): Int = when (phase) {
        SunWidgetPhase.DAY -> R.string.widget_sun_description_day
        SunWidgetPhase.NIGHT -> R.string.widget_sun_description_night
    }

    private fun openSunIntent(context: Context): Intent =
        Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            putExtra(MainActivity.EXTRA_LAUNCH_ROUTE, MainActivity.OPEN_SUN_HASH)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
}

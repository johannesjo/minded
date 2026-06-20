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

/**
 * The home-screen companion sun. A calm, static sun (moon at night) that simply
 * rests on the home screen — no metrics, no badge, nothing to grade. Tapping it
 * launches the app and opens the same sun interaction as tapping the in-app
 * dashboard companion. It is presence and invitation, never an interrupt.
 * See docs/sun-companion-widget.md.
 */
class MyAppWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .clickable(actionStartActivity(openSunIntent(context))),
                contentAlignment = Alignment.Center,
            ) {
                Image(
                    provider = ImageProvider(R.drawable.ic_sun_widget),
                    // Day/night handled by the drawable-night qualifier, not a tint.
                    contentDescription = context.getString(R.string.widget_sun_description),
                    modifier = GlanceModifier.size(72.dp),
                )
            }
        }
    }

    private fun openSunIntent(context: Context): Intent =
        Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            putExtra(MainActivity.EXTRA_LAUNCH_ROUTE, MainActivity.OPEN_SUN_HASH)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
}

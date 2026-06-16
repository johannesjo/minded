package com.minded.minded.widget

import android.content.Context
import android.util.Log
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.minded.minded.MainActivity
import com.minded.minded.R
import com.minded.minded.util.parseSyncData

/**
 * Home-screen "companion sun" — a 1x1 widget whose appearance reflects how the
 * day is going (see [computeSunCompanionState]). Tapping it opens minded, which
 * is the global "give me a mindful moment" gesture.
 *
 * Prototype scope: the sun is rendered as a flat, mood-tinted glyph (Glance
 * cannot draw the gradient/animated sun used inside the app). State is derived
 * from the same `mindedData` SharedPreferences the rest of the Android app uses.
 */
class SunCompanionWidget : GlanceAppWidget() {

    suspend fun updateAll(context: Context) {
        val manager = GlanceAppWidgetManager(context)
        manager.getGlanceIds(this.javaClass).forEach { glanceId ->
            update(context, glanceId)
        }
    }

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val prefs = context.getSharedPreferences("mindedData", Context.MODE_PRIVATE)
        val raw = prefs.getString("mindedAll", null)
        val state = try {
            if (raw != null) computeSunCompanionState(parseSyncData(raw)) else null
        } catch (e: Exception) {
            Log.w("SunCompanionWidget", "Failed to parse sync data, showing neutral sun", e)
            null
        }

        provideContent {
            SunCompanionContent(state ?: NEUTRAL_STATE)
        }
    }

    companion object {
        /** Calm fallback when there is no data yet (e.g. before onboarding). */
        private val NEUTRAL_STATE =
            SunCompanionState(SunMood.RADIANT, budgetFraction = null, remainingSeconds = null, label = "")
    }
}

@androidx.compose.runtime.Composable
private fun SunCompanionContent(state: SunCompanionState) {
    val isNight = state.mood == SunMood.NIGHT
    val drawable = if (isNight) R.drawable.ic_moon_companion else R.drawable.ic_sun_companion
    val tint = moodTint(state.mood)
    // Spent / night labels would clutter the small disc, so only count down while
    // there is meaningful budget left.
    val showLabel = state.label.isNotEmpty() && state.mood != SunMood.SPENT

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(4.dp)
            .clickable(actionStartActivity<MainActivity>()),
        contentAlignment = Alignment.Center,
    ) {
        Image(
            provider = ImageProvider(drawable),
            contentDescription = contentDescriptionFor(state),
            modifier = GlanceModifier.size(44.dp),
            colorFilter = ColorFilter.tint(ColorProvider(tint)),
        )
        if (showLabel) {
            Text(
                text = state.label,
                style = TextStyle(
                    color = ColorProvider(LABEL_COLOR),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                ),
            )
        }
    }
}

/** Warm gold → cool grey as the day's budget drains; indigo for night. */
private fun moodTint(mood: SunMood): Color = when (mood) {
    SunMood.RADIANT -> Color(0xFFFFB24F)
    SunMood.DIMMING -> Color(0xFFE3A55E)
    SunMood.LOW -> Color(0xFFC9A98F)
    SunMood.SPENT -> Color(0xFF9E978C)
    SunMood.NIGHT -> Color(0xFF8B93C7)
}

/** Dark brown so the count-down reads against the warm disc. */
private val LABEL_COLOR = Color(0xFF5A3210)

private fun contentDescriptionFor(state: SunCompanionState): String = when (state.mood) {
    SunMood.RADIANT -> "minded: on track" + labelSuffix(state)
    SunMood.DIMMING -> "minded: budget half spent" + labelSuffix(state)
    SunMood.LOW -> "minded: budget almost gone" + labelSuffix(state)
    SunMood.SPENT -> "minded: budget spent for today"
    SunMood.NIGHT -> "minded: wind-down time"
}

private fun labelSuffix(state: SunCompanionState): String =
    if (state.label.isNotEmpty()) ", ${state.label} left" else ""

package com.minded.minded.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontFamily
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.minded.minded.MainActivity
import com.minded.minded.R
import java.time.LocalDateTime

/**
 * The home-screen companion sun: a calm, living anchor that tracks the day's
 * natural light — the warm sun by day, the cool moon at night. It carries no
 * metrics, badge, or anything to grade; it just reflects where you actually are
 * in the day (present-moment, never a stale timestamp).
 * Tapping it launches the app and opens the same sun interaction as tapping the
 * in-app dashboard companion. It is presence and invitation, never an interrupt.
 *
 * Two faces, one widget: at small sizes the familiar floating sun; at card size
 * a miniature still of the in-app intervention screen — the same sky, one quiet
 * serif line (WidgetPrompts), the sun resting beneath it. See
 * docs/sun-companion-widget.md and docs/widget-prompts-concept.md.
 *
 * The phase is chosen from the local hour; MyAppWidgetReceiver arms one alarm per
 * phase/prompt change to refresh it.
 */
class MyAppWidget : GlanceAppWidget() {

    override val sizeMode: SizeMode = SizeMode.Responsive(setOf(SUN_ONLY, PROMPT_CARD))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            // Read the clock inside the composition: a recomposition within a
            // still-open Glance session (host events) then can't repaint a
            // boundary-stale snapshot.
            val now = LocalDateTime.now()
            val phase = SunWidgetPhase.forHour(now.hour)
            if (LocalSize.current == PROMPT_CARD) {
                val prompt =
                    WidgetPrompts.promptForMoment(now.toLocalDate().toEpochDay(), now.hour)
                PromptCard(context, phase, prompt)
            } else {
                SunOnly(context, phase)
            }
        }
    }

    @Composable
    private fun SunOnly(context: Context, phase: SunWidgetPhase) {
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

    /**
     * A miniature of the in-app intervention screen: the sky (card-sized renders
     * of the exact app sky, dithered at target size — see gen_loading_sky.py), a
     * serif line in the app's voice, and the sun beneath it — text above, sun
     * below, the intervention layout. Like everything on this widget the sky
     * follows the clock, not the system theme; at night the prompt is null and
     * the moon carries the card alone (words at 2 a.m. read as a nudge).
     */
    @Composable
    private fun PromptCard(context: Context, phase: SunWidgetPhase, prompt: String?) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                // background(ImageProvider) stretches by default (FillBounds) —
                // right for a vertical gradient: the full top-to-horizon sweep is
                // the look, and distortion is invisible on a gradient.
                .background(ImageProvider(skyFor(phase)))
                // Rounded like the app's surfaces; silently ignored below API 31,
                // where the sky simply fills the rectangle.
                .cornerRadius(24.dp)
                // Carry the exact line being shown so the tap lands on that same
                // interaction (null at night → a plain sun-open). Every placed card
                // shows the same deterministic line for a moment, so all their
                // intents carry the same value — no PendingIntent-uniqueness worry.
                .clickable(actionStartActivity(openSunIntent(context, prompt)))
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (prompt != null) {
                Text(
                    text = prompt,
                    style = TextStyle(
                        // --c-fg-full-emphasis (light theme): rgba(0,0,0,.85).
                        // Only ever rendered on the light sky — night has no text,
                        // by construction (see WidgetPrompts).
                        color = ColorProvider(Color(0xD9000000)),
                        fontSize = 15.sp,
                        // The app's question voice is a serif (Newsreader);
                        // widgets can't embed fonts, so the platform serif
                        // carries the same register.
                        fontFamily = FontFamily.Serif,
                        textAlign = TextAlign.Center,
                    ),
                    maxLines = 3,
                )
                Spacer(GlanceModifier.height(8.dp))
            }
            Image(
                provider = ImageProvider(drawableFor(phase)),
                contentDescription = context.getString(descriptionFor(phase)),
                modifier = GlanceModifier.size(44.dp),
            )
        }
    }

    private fun skyFor(phase: SunWidgetPhase): Int = when (phase) {
        SunWidgetPhase.DAY -> R.drawable.widget_sky_light
        SunWidgetPhase.NIGHT -> R.drawable.widget_sky_dark
    }

    private fun drawableFor(phase: SunWidgetPhase): Int = when (phase) {
        SunWidgetPhase.DAY -> R.drawable.ic_sun_widget_day
        SunWidgetPhase.NIGHT -> R.drawable.ic_sun_widget_night
    }

    private fun descriptionFor(phase: SunWidgetPhase): Int = when (phase) {
        SunWidgetPhase.DAY -> R.string.widget_sun_description_day
        SunWidgetPhase.NIGHT -> R.string.widget_sun_description_night
    }

    private fun openSunIntent(context: Context, widgetLine: String? = null): Intent =
        Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            putExtra(MainActivity.EXTRA_LAUNCH_ROUTE, MainActivity.OPEN_SUN_HASH)
            // The card passes the exact line it's showing so the tap opens that
            // same NOTICE/ACTION_ADVICE; MainActivity allow-lists it before use.
            // The sun-only face has no line and passes none.
            if (widgetLine != null) {
                putExtra(MainActivity.EXTRA_WIDGET_LINE, widgetLine)
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

    private companion object {
        // The two responsive faces. The card's 140dp height floor is a fit
        // guarantee, not a guess: 12dp padding ×2 + 3 serif lines at 15sp
        // (~60dp) + 8dp spacer + 44dp sun ≈ 136dp. Placements too short for
        // that (flat rows, dense grids, landscape) keep the plain floating sun
        // rather than a clipped card.
        val SUN_ONLY = DpSize(40.dp, 40.dp)
        val PROMPT_CARD = DpSize(170.dp, 140.dp)
    }
}

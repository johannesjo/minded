package com.minded.minded.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
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
 * natural light - the warm sun by day, the cool moon at night. It carries no
 * metrics, badge, or anything to grade; it just reflects where you actually are
 * in the day (present-moment, never a stale timestamp).
 * Tapping it launches the app and opens the same sun interaction as tapping the
 * in-app dashboard companion. It is presence and invitation, never an interrupt.
 *
 * Two faces, one widget: at small sizes the familiar floating sun; at card size
 * a miniature still of the in-app intervention screen - the same sky, one quiet
 * serif line (WidgetPrompts), the sun resting beneath it. See
 * docs/sun-companion-widget.md and docs/widget-prompts-concept.md.
 *
 * The sun/moon *fills the space it's given* rather than floating as a fixed dot
 * in an oversized tile: bigger placement → bigger sun (companionSunSize). That is
 * why the mode is SizeMode.Exact, not Responsive - Responsive quantises
 * LocalSize to the registered breakpoints, so it could never tell a 1×1 from a
 * 4×4 to scale between them. Exact hands us the real tile size, from which we both
 * pick the face (card once it's wide *and* tall enough) and scale the sun.
 *
 * The phase and sky are chosen from the local hour; MyAppWidgetReceiver arms one
 * alarm per sky/phase/prompt change to refresh it.
 */
class MyAppWidget : GlanceAppWidget() {

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            // Read the clock inside the composition: a recomposition within a
            // still-open Glance session (host events) then can't repaint a
            // boundary-stale snapshot.
            val now = LocalDateTime.now()
            val phase = SunWidgetPhase.forHour(now.hour)
            val size = LocalSize.current
            // The card only when the tile is both wide and tall enough to fit the
            // serif line + sun without clipping (the CARD_MIN floor); anything
            // shorter - flat rows, dense grids, landscape - keeps the plain sun.
            if (size.width >= CARD_MIN.width && size.height >= CARD_MIN.height) {
                val prompt = WidgetPrompts.promptForMoment(
                    now.toLocalDate().toEpochDay(), now.hour, now.minute,
                )
                PromptCard(context, phase, WidgetSky.forHour(now.hour), prompt, size)
            } else {
                SunOnly(context, phase, size)
            }
        }
    }

    @Composable
    private fun SunOnly(context: Context, phase: SunWidgetPhase, size: DpSize) {
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .clickable(actionStartActivity(openSunIntent(context))),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                provider = ImageProvider(drawableFor(phase)),
                contentDescription = context.getString(descriptionFor(phase)),
                // Grow with the tile so a 2×2 companion isn't a small dot in a big
                // box, but never below the plain 1×1 sun (SUN_SIZE floor).
                modifier = GlanceModifier.size(
                    companionSunSize(size, SUN_ONLY_FRACTION, SUN_SIZE),
                ),
            )
        }
    }

    /**
     * A miniature of the in-app intervention screen: the sky (card-sized renders
     * of the exact app sky, dithered at target size - see gen_loading_sky.py), a
     * serif line in the app's voice, and the sun beneath it - text above, sun
     * below, the intervention layout. Like everything on this widget the sky
     * follows the clock, not the system theme - and like the app's ambient
     * background it moves through the day's keyframes (WidgetSky, stepping
     * dawn → morning → midday → afternoon → dusk); at night the prompt is null
     * and the moon carries the card alone (words at 2 a.m. read as a nudge).
     */
    @Composable
    private fun PromptCard(
        context: Context,
        phase: SunWidgetPhase,
        sky: WidgetSky,
        prompt: String?,
        size: DpSize,
    ) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                // background(ImageProvider) stretches by default (FillBounds) -
                // right for a vertical gradient: the full top-to-horizon sweep is
                // the look, and distortion is invisible on a gradient.
                .background(ImageProvider(skyFor(sky)))
                // Rounded like the app's surfaces; silently ignored below API 31,
                // where the sky simply fills the rectangle.
                .cornerRadius(24.dp)
                // Carry the exact line being shown so the tap lands on that same
                // interaction (null at night → a plain sun-open). Every placed card
                // shows the same deterministic line for a moment, so all their
                // intents carry the same value - no PendingIntent-uniqueness worry.
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
                        // Only ever rendered on the light sky - night has no text,
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
                // Both faces of the card scale with the tile so the sun/moon fills
                // a large card instead of floating lost in it. Beneath a line the
                // sun is a modest mark sharing the space (CARD_SUN_FRACTION, floored
                // at CARD_SUN_SIZE); with no line (night - the moon carries the card
                // alone) it grows generously to own the empty card
                // (CARD_MOON_FRACTION, floored at the plain sun's SUN_SIZE).
                modifier = GlanceModifier.size(
                    if (prompt != null) {
                        companionSunSize(size, CARD_SUN_FRACTION, CARD_SUN_SIZE)
                    } else {
                        companionSunSize(size, CARD_MOON_FRACTION, SUN_SIZE)
                    },
                ),
            )
        }
    }

    private fun skyFor(sky: WidgetSky): Int = when (sky) {
        WidgetSky.DAWN -> R.drawable.widget_sky_dawn
        WidgetSky.MORNING -> R.drawable.widget_sky_morning
        WidgetSky.MIDDAY -> R.drawable.widget_sky_midday
        WidgetSky.AFTERNOON -> R.drawable.widget_sky_afternoon
        WidgetSky.DUSK -> R.drawable.widget_sky_dusk
        WidgetSky.NIGHT -> R.drawable.widget_sky_dark
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
        // Size floors - the sun/moon scales up with the tile from here, never
        // below. SUN_SIZE is the plain 1×1 sun/moon and the floor for the night
        // moon that carries the card alone; CARD_SUN_SIZE is the smaller mark
        // beneath a prompt line, and its floor on the smallest card.
        val SUN_SIZE = 72.dp
        val CARD_SUN_SIZE = 44.dp

        // How much of the tile's shorter side the sun/moon claims, per face. The
        // plain sun fills its tile boldly; the night moon owns the card generously
        // but leaves the card's edges breathing; the daytime sun stays a modest
        // mark so the serif line above it keeps the card.
        const val SUN_ONLY_FRACTION = 0.75f
        const val CARD_MOON_FRACTION = 0.62f
        const val CARD_SUN_FRACTION = 0.30f

        // The tile size at/above which the card face fits. The 140dp height is a
        // fit guarantee, not a guess: 12dp padding ×2 + 3 serif lines at 15sp
        // (~60dp) + 8dp spacer + 44dp sun ≈ 136dp. Placements shorter or narrower
        // (flat rows, dense grids, landscape) keep the plain floating sun rather
        // than a clipped card.
        val CARD_MIN = DpSize(170.dp, 140.dp)
    }
}

/**
 * The size for the companion sun/moon inside a tile of [available] space: a
 * [fraction] of the tile's shorter side (so the disc stays round at any aspect
 * ratio), but never below [floor] (so it never shrinks under the plain companion
 * on small placements). Bigger tile → bigger sun, instead of a fixed dot floating
 * in an oversized tile.
 */
private fun companionSunSize(available: DpSize, fraction: Float, floor: Dp): Dp =
    maxOf(floor, minOf(available.width, available.height) * fraction)

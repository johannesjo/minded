package com.minded.minded.widget

import android.content.Context
import android.content.Intent
import android.os.Build
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
import androidx.glance.appwidget.appWidgetBackground
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
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

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
 * The phase and sky follow the real sun (WidgetSun, the port of the app's
 * solarSky.ts); MyAppWidgetReceiver arms one alarm per sky/phase/prompt change
 * to refresh it.
 */
class MyAppWidget : GlanceAppWidget() {

    override val sizeMode: SizeMode = SizeMode.Exact

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            // Read the clock inside the composition: a recomposition within a
            // still-open Glance session (host events) then can't repaint a
            // boundary-stale snapshot.
            val nowMillis = System.currentTimeMillis()
            val zone = ZoneId.systemDefault()
            val now = LocalDateTime.ofInstant(Instant.ofEpochMilli(nowMillis), zone)
            // One read of the light drives the sun/moon, the sky, and whether the
            // card carries words - so the three can never disagree (WidgetSun:
            // the real sun, like the app; the fixed clock only without a place).
            val moment = WidgetSun.momentAt(nowMillis, zone)
            val phase = SunWidgetPhase.forMoment(moment)
            // Tonight's moon, not a generic full one - the same phase as the
            // app's (WidgetMoon). Null by day and at (near) full moon.
            val moonOutline = if (moment.isNight) {
                WidgetMoon.luneOutline(WidgetMoon.phaseAt(nowMillis), moment.isSouthernHemisphere)
            } else {
                null
            }
            val size = LocalSize.current
            // The card only when the tile is both wide and tall enough to fit the
            // serif line + sun without clipping (the CARD_MIN floor); anything
            // shorter - flat rows, dense grids, landscape - keeps the plain sun.
            if (size.width >= CARD_MIN.width && size.height >= CARD_MIN.height) {
                val prompt = WidgetPrompts.promptForMoment(
                    now.toLocalDate().toEpochDay(), now.hour, now.minute, moment.isNight,
                )
                PromptCard(context, phase, moonOutline, WidgetSky.forMoment(moment), prompt, size)
            } else {
                SunOnly(context, phase, moonOutline, size)
            }
        }
    }

    @Composable
    private fun SunOnly(
        context: Context,
        phase: SunWidgetPhase,
        moonOutline: List<Pair<Float, Float>>?,
        size: DpSize,
    ) {
        // Grow with the tile so a 2×2 companion isn't a small dot in a big box,
        // but never below the plain 1×1 sun (SUN_SIZE floor).
        val sunSize = companionSunSize(size, SUN_ONLY_FRACTION, SUN_SIZE)
        val spot = WidgetSunSpot.inTile(size.width.value, size.height.value, sunSize.value)
        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                // Marks the widget's own surface for the launcher (API 31+), so a
                // tap expands *this* tile softly into the app instead of the
                // generic launch zoom - the first half of the sun's morph.
                .appWidgetBackground()
                .clickable(actionStartActivity(openSunIntent(context, spot = spot))),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                provider = sunImage(context, phase, moonOutline, sunSize),
                contentDescription = context.getString(descriptionFor(phase)),
                modifier = GlanceModifier.size(sunSize),
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
        moonOutline: List<Pair<Float, Float>>?,
        sky: WidgetSky,
        prompt: String?,
        size: DpSize,
    ) {
        // Both faces of the card scale with the tile so the sun/moon fills a
        // large card instead of floating lost in it. Beneath a line the sun is a
        // modest mark sharing the space (CARD_SUN_FRACTION, floored at
        // CARD_SUN_SIZE); with no line (night - the moon carries the card alone)
        // it grows generously to own the empty card (CARD_MOON_FRACTION, floored
        // at the plain sun's SUN_SIZE).
        val sunSize = if (prompt != null) {
            companionSunSize(size, CARD_SUN_FRACTION, CARD_SUN_SIZE)
        } else {
            companionSunSize(size, CARD_MOON_FRACTION, SUN_SIZE)
        }
        val fontSp = promptTextSize(size)
        val spot = WidgetSunSpot.inTile(
            size.width.value, size.height.value, sunSize.value, prompt, fontSp,
        )
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                // background(ImageProvider) stretches by default (FillBounds) -
                // right for a vertical gradient: the full top-to-horizon sweep is
                // the look, and distortion is invisible on a gradient.
                .background(ImageProvider(skyFor(sky)))
                // The launcher's own widget radius, so the card sits flush with
                // every other widget on the screen and the launch transition
                // (appWidgetBackground) expands from the same shape.
                .appWidgetBackground()
                .launcherCornerRadius()
                // Carry the exact line being shown so the tap lands on that same
                // interaction (null at night → a plain sun-open), and where the
                // sun sits in this tile. Glance keys each click's PendingIntent by
                // its widget and view, so differently sized cards can't swap spots.
                .clickable(actionStartActivity(openSunIntent(context, prompt, spot)))
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (prompt != null) {
                Text(
                    text = WidgetPrompts.withoutOrphan(prompt),
                    style = TextStyle(
                        // --c-fg-full-emphasis (light theme): rgba(0,0,0,.85).
                        // Only ever rendered on the light sky - night has no text,
                        // by construction (see WidgetPrompts).
                        color = ColorProvider(Color(0xD9000000)),
                        // Grows with the card so a big placement isn't a small
                        // line lost in a sky (promptTextSize keeps it fitting).
                        fontSize = fontSp.sp,
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
                // On the card the sun stands on the app's own sky, so its halo is
                // white (THE HALO RULE) - the amber twin is for the bare sun on
                // the wallpaper.
                provider = sunImage(context, phase, moonOutline, sunSize, onOwnSky = true),
                contentDescription = context.getString(descriptionFor(phase)),
                modifier = GlanceModifier.size(sunSize),
            )
        }
    }

    private fun skyFor(sky: WidgetSky): Int = when (sky) {
        WidgetSky.DAWN -> R.drawable.widget_sky_dawn
        WidgetSky.MORNING -> R.drawable.widget_sky_morning
        WidgetSky.MIDDAY -> R.drawable.widget_sky_midday
        WidgetSky.AFTERNOON -> R.drawable.widget_sky_afternoon
        WidgetSky.DUSK -> R.drawable.widget_sky_dusk
        WidgetSky.NIGHTFALL -> R.drawable.widget_sky_nightfall
        WidgetSky.NIGHT -> R.drawable.widget_sky_dark
    }

    /**
     * The sun/moon face, picked by phase *and* by what it stands on.
     *
     * THE HALO RULE (see sunSettle.ts in the web sources): the sun's amber bloom
     * is only for a background we don't control. `onOwnSky` is true on the
     * PromptCard, whose sky is the app's own - there the sun glows white, exactly
     * as it does in app. The bare sun sits on the user's wallpaper, so it keeps
     * the amber and stays legible on anything. The moon is the same drawable
     * either way: it never warms, on any surface.
     */
    private fun drawableFor(phase: SunWidgetPhase, onOwnSky: Boolean = false): Int =
        when (phase) {
            SunWidgetPhase.DAY ->
                if (onOwnSky) R.drawable.ic_sun_widget_day_on_sky
                else R.drawable.ic_sun_widget_day
            SunWidgetPhase.NIGHT -> R.drawable.ic_sun_widget_night
        }

    /**
     * The sun/moon image: the vector face, or - on a night that isn't full
     * moon - tonight's phased moon rendered at the size it's shown.
     */
    private fun sunImage(
        context: Context,
        phase: SunWidgetPhase,
        moonOutline: List<Pair<Float, Float>>?,
        size: Dp,
        onOwnSky: Boolean = false,
    ): ImageProvider {
        if (phase == SunWidgetPhase.NIGHT && moonOutline != null) {
            val px = (size.value * context.resources.displayMetrics.density).toInt()
            WidgetMoonBitmap.render(context, moonOutline, px)?.let { return ImageProvider(it) }
        }
        return ImageProvider(drawableFor(phase, onOwnSky))
    }

    private fun descriptionFor(phase: SunWidgetPhase): Int = when (phase) {
        SunWidgetPhase.DAY -> R.string.widget_sun_description_day
        SunWidgetPhase.NIGHT -> R.string.widget_sun_description_night
    }

    private fun openSunIntent(
        context: Context,
        widgetLine: String? = null,
        spot: WidgetSunSpot.Spot? = null,
    ): Intent =
        Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            putExtra(MainActivity.EXTRA_LAUNCH_ROUTE, MainActivity.OPEN_SUN_HASH)
            // The card passes the exact line it's showing so the tap opens that
            // same NOTICE/ACTION_ADVICE; MainActivity allow-lists it before use.
            // The sun-only face has no line and passes none.
            if (widgetLine != null) {
                putExtra(MainActivity.EXTRA_WIDGET_LINE, widgetLine)
            }
            // Where the sun sits in this tile, so the app can start its sun on
            // this one (MainActivity pairs it with the launcher's sourceBounds).
            if (spot != null) {
                putExtra(MainActivity.EXTRA_WIDGET_SUN_SPOT, spot.toArray())
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
 * The launcher's own widget corner radius (API 31+, where the system defines
 * one and Glance can apply it). Below that the sky simply fills the rectangle,
 * as every pre-12 widget does.
 */
private fun GlanceModifier.launcherCornerRadius(): GlanceModifier =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        cornerRadius(android.R.dimen.system_app_widget_background_radius)
    } else {
        this
    }

/**
 * The prompt's type size for a card of [size]: bounded by the width (≈12dp per
 * sp keeps the longest 70-char line within its 3 lines) and by the height (so
 * 3 lines + the sun + padding still fit), from 15sp on the smallest card - the
 * size MyAppWidget's CARD_MIN fit guarantee was computed for - up to 19sp.
 */
private fun promptTextSize(size: DpSize): Float {
    val byWidth = (size.width.value - 24f) / 12f
    val byHeight = size.height.value / 9.5f
    return minOf(byWidth, byHeight).coerceIn(15f, 19f)
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

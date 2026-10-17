package com.minded.minded.ui.compose

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.minded.minded.util.isDarkModeNow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.hypot
import kotlin.math.roundToInt

/** The bell's own sun: exactly the Little Sun bubble (disc + its own glow). */
val BELL_SUN_DISC_BOX = 60.dp

/** The bell's own sun body - SunDisc's default, half the box. An intervention taking over grows from this. */
val BELL_SUN_BODY = 30.dp

// The sun eases in, and the strike comes as it settles - no silent wait
// between the sun appearing and the bell sounding.
private const val ARRIVE_MS = 600
// The strike's light is brightest at once and then only fades…
private const val STRIKE_RISE_MS = 200
// …over the audible part of the strike: single_bell.mp3 is under -60 dB from
// about 4s on, so a light that lasted its full 5.5s would outlive the sound.
private const val MAX_VISIBLE_DECAY_MS = 4500
// After the light has gone, the sun lingers a beat, then fades away.
private const val LINGER_MS = 300
private const val LEAVE_MS = 1200

/**
 * One ring of the mindfulness bell (#298): the sun's arrival and leaving
 * ([presence]), the strike's brightness ([swell]), and how far its light has
 * travelled ([spread]).
 */
class BellSunState {
    /** 0 = absent, 1 = fully here: the sun's arrival and leaving. */
    val presence = Animatable(0f)

    /** The strike's light: 1 at the strike, fading to 0 with the tone. */
    val swell = Animatable(0f)

    /** Where the strike's ring is: 0 = at the sun's rim, 1 = at its farthest. */
    val spread = Animatable(0f)

    var isLeaving by mutableStateOf(false)
}

/**
 * The mindfulness bell (#298), drawn in one full-screen, untouchable window:
 * the sun, a light dim over the rest of the screen that comes and goes with it
 * - the world quiets while the bell rings - and the strike's light. It appears,
 * rings once, and leaves on its own. No words, nothing to do, and nothing to
 * touch: it sits where the eyes are after an unlock, which is also where a
 * finger is headed, so every tap goes through to the app beneath.
 *
 * The bell must work fully without sound - many phones are muted most of the
 * day - so the visual *is* the bell: at the strike a ring of light leaves the
 * sun and travels outward, thinning as it goes, the way a struck tone spreads
 * into the room and fades into silence. It only ever moves outward. A light
 * that swelled and drew back in would be one breath - the unguided
 * "breathing" the companion sun must never carry.
 *
 * Colour: the sun stands on someone else's app, a background we don't
 * control, so it wears the Little Sun's amber halo ([SunDisc] with
 * onOwnSky = false; the moon's cool halo at night) - THE HALO RULE in
 * sunSettle.ts. The ring is that same halo colour, never a second one.
 *
 * With animations removed system-wide nothing moves: the ring holds still,
 * close to the sun, for the decay and then is gone.
 *
 * [center] is the ringing sun's centre and [sunRadiusPx] its radius, in this
 * window's pixels. With [showDisc] false the bell rings through a sun that's
 * already there (the Little Sun, the widget's sun): it draws no disc, and the
 * ring leaves that sun's rim instead.
 *
 * Drawn through a window held at 0.8 alpha so touches pass through
 * (BellSunWindow.WINDOW_ALPHA); the alphas below are set for that.
 */
@Composable
fun BellSun(
    state: BellSunState,
    decayMs: Int,
    center: Offset,
    sunRadiusPx: Float,
    onStrike: () -> Unit,
    onGone: () -> Unit,
    showDisc: Boolean = true,
) {
    val context = LocalContext.current
    val reducedMotion = remember {
        Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        ) == 0f
    }

    LaunchedEffect(Unit) {
        // Taken over before it even began: no strike.
        if (state.isLeaving) return@LaunchedEffect
        val visibleDecayMs = decayMs.coerceAtMost(MAX_VISIBLE_DECAY_MS)
        if (reducedMotion) {
            state.presence.snapTo(1f)
            onStrike()
            state.spread.snapTo(REDUCED_MOTION_SPREAD)
            state.swell.snapTo(0.6f)
            delay(visibleDecayMs.toLong())
            state.swell.snapTo(0f)
        } else {
            state.presence.animateTo(1f, tween(ARRIVE_MS, easing = FastOutSlowInEasing))
            if (state.isLeaving) return@LaunchedEffect
            onStrike()
            // The ring travels the whole decay, quickly at first, slowing as
            // it fades - the long tail of a struck bell.
            launch {
                state.spread.animateTo(1f, tween(visibleDecayMs, easing = LinearOutSlowInEasing))
            }
            state.swell.animateTo(1f, tween(STRIKE_RISE_MS, easing = FastOutSlowInEasing))
            state.swell.animateTo(
                0f,
                tween((visibleDecayMs - STRIKE_RISE_MS).coerceAtLeast(0), easing = LinearOutSlowInEasing),
            )
            delay(LINGER_MS.toLong())
        }
        if (state.isLeaving) return@LaunchedEffect
        state.isLeaving = true
        if (!reducedMotion) {
            state.presence.animateTo(0f, tween(LEAVE_MS, easing = FastOutSlowInEasing))
        }
        onGone()
    }

    val glowColor = if (isDarkModeNow()) GLOW_COLOR_NIGHT else GLOW_COLOR
    Box(modifier = Modifier.fillMaxSize()) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val p = state.presence.value
            // No radius, no light: a gradient of radius 0 would throw.
            if (p <= 0f || sunRadiusPx <= 0f) return@Canvas

            // The dim: clear over the sun and just past it, easing to its full
            // depth a little further out, so the sun and its light stay bright.
            val farthest = hypot(
                maxOf(center.x, size.width - center.x),
                maxOf(center.y, size.height - center.y),
            )
            val clearEnd = (sunRadiusPx * DIM_CLEAR_RADII / farthest).coerceIn(0f, 0.9f)
            val fullAt = (sunRadiusPx * DIM_FULL_RADII / farthest).coerceIn(clearEnd + 0.01f, 1f)
            val dim = DIM_COLOR.copy(alpha = DIM_ALPHA * p)
            drawRect(
                Brush.radialGradient(
                    0f to Color.Transparent,
                    clearEnd to Color.Transparent,
                    fullAt to dim,
                    1f to dim,
                    center = center,
                    radius = farthest,
                ),
            )

            val s = state.swell.value
            if (s <= 0f) return@Canvas
            // A soft band of light, leaving the sun's rim and travelling out.
            // It widens as it goes, so it thins rather than shrinks.
            val ring = sunRadiusPx + sunRadiusPx * (RING_REACH_RADII - 1f) * state.spread.value
            val halfWidth = sunRadiusPx * (RING_WIDTH_RADII / 2f) * (0.6f + 0.8f * state.spread.value)
            val outer = ring + halfWidth
            // Never inside the sun: on a host this window sits above it, and a
            // light filling the middle would wash it out.
            val inner = maxOf(ring - halfWidth, sunRadiusPx * 0.85f)
            // These read as ~0.72 through the window's alpha.
            val peak = glowColor.copy(alpha = 0.9f * s * p)
            drawCircle(
                Brush.radialGradient(
                    0f to Color.Transparent,
                    (inner / outer) to Color.Transparent,
                    (ring / outer).coerceAtLeast(inner / outer + 0.001f) to peak,
                    1f to Color.Transparent,
                    center = center,
                    radius = outer,
                ),
                radius = outer,
                center = center,
            )
        }

        if (showDisc) {
            val boxPx = with(LocalDensity.current) { BELL_SUN_DISC_BOX.toPx() }
            Box(
                modifier = Modifier
                    .offset {
                        IntOffset(
                            (center.x - boxPx / 2f).roundToInt(),
                            (center.y - boxPx / 2f).roundToInt(),
                        )
                    }
                    .alpha(state.presence.value),
            ) {
                SunDisc(modifier = Modifier.scale(0.85f + 0.15f * state.presence.value))
            }
        }
    }
}

// The dim's depth as seen (0.35) through the window's 0.8 alpha.
private const val DIM_ALPHA = 0.44f
private val DIM_COLOR = Color.Black
// The dim is clear out to this many sun radii, and full from this many.
private const val DIM_CLEAR_RADII = 1.4f
private const val DIM_FULL_RADII = 4f
// The ring travels out to this many sun radii, and is this many wide at the strike.
private const val RING_REACH_RADII = 4.5f
private const val RING_WIDTH_RADII = 1.2f
// With no motion, the ring holds here: just off the sun's rim.
private const val REDUCED_MOTION_SPREAD = 0.2f

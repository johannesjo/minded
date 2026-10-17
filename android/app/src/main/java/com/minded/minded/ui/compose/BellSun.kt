package com.minded.minded.ui.compose

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.minded.minded.util.isDarkModeNow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.hypot

/** The disc's window: exactly the Little Sun bubble (disc + its own glow). */
val BELL_SUN_DISC_BOX = 60.dp

/** The halo's window: room for the swell to spread around the disc. */
val BELL_SUN_HALO_BOX = 132.dp

// The sun eases in before the strike - a soft arrival, never a pop.
private const val ARRIVE_MS = 1200
// The swell rises quickly-but-softly at the strike…
private const val SWELL_RISE_MS = 500
// …and, after the light has settled, the sun lingers a beat, then fades away.
private const val LINGER_MS = 600
private const val LEAVE_MS = 1500
// A tap lets the sun go sooner, still with a fade.
private const val TAP_LEAVE_MS = 700

/**
 * One ring of the mindfulness bell (#298), shared by its two windows: the
 * touchable disc ([BellSunDisc]) and the untouchable halo around it
 * ([BellSunHalo]). Two windows so the bell only ever takes a touch on the sun
 * itself - the spreading light sits over the user's app but never catches a
 * finger meant for it.
 */
class BellSunState {
    /** 0 = absent, 1 = fully here: the sun's arrival and leaving. */
    val presence = Animatable(0f)

    /** The strike's light: 0 = the plain halo, 1 = the swell at its height. */
    val swell = Animatable(0f)

    var isLeaving by mutableStateOf(false)
}

/**
 * The sun itself: it appears, rings once, and leaves on its own. No words,
 * nothing to do.
 *
 * The bell must work fully without sound - many phones are muted most of the
 * day - so the visual *is* the bell: at the strike the halo swells once and
 * then fades over the bell's decay ([decayMs]), the way a struck tone fades
 * into silence. The practice is to watch the light settle until it's gone.
 * One swell, never repeating: a repeating pulse would be the unguided
 * "breathing" the companion sun must never carry.
 *
 * Colour: the sun stands on someone else's app, a background we don't
 * control, so it wears the Little Sun's amber halo ([SunDisc] with
 * onOwnSky = false; the moon's cool halo at night) - THE HALO RULE in
 * sunSettle.ts. The swell is that same halo, brighter, never a second colour.
 *
 * With animations removed system-wide nothing moves: the swell holds as a
 * still, brighter halo for the decay and then is gone.
 *
 * Without [showDisc] the bell rings through a sun that's already there (the
 * Little Sun, the widget's sun): this keeps the strike's timing and draws
 * nothing - the light rises from that sun instead.
 */
@Composable
fun BellSunDisc(
    state: BellSunState,
    decayMs: Int,
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
    val scope = rememberCoroutineScope()

    fun leave(durationMs: Int) {
        if (state.isLeaving) return
        state.isLeaving = true
        scope.launch {
            state.presence.animateTo(0f, tween(durationMs, easing = FastOutSlowInEasing))
            onGone()
        }
    }

    LaunchedEffect(Unit) {
        // Taken over before it even began: no strike.
        if (state.isLeaving) return@LaunchedEffect
        if (reducedMotion) {
            state.presence.snapTo(1f)
            onStrike()
            state.swell.snapTo(0.6f)
            delay(decayMs.toLong())
            state.swell.snapTo(0f)
        } else {
            state.presence.animateTo(1f, tween(ARRIVE_MS, easing = FastOutSlowInEasing))
            if (state.isLeaving) return@LaunchedEffect
            onStrike()
            state.swell.animateTo(1f, tween(SWELL_RISE_MS, easing = FastOutSlowInEasing))
            // The long tail of a struck bell: most of the light goes early, the
            // last of it lingers.
            state.swell.animateTo(
                0f,
                tween((decayMs - SWELL_RISE_MS).coerceAtLeast(0), easing = LinearOutSlowInEasing),
            )
            delay(LINGER_MS.toLong())
        }
        leave(if (reducedMotion) 0 else LEAVE_MS)
    }

    if (!showDisc) {
        Box(modifier = Modifier.size(BELL_SUN_DISC_BOX))
        return
    }
    Box(
        modifier = Modifier
            .size(BELL_SUN_DISC_BOX)
            .alpha(state.presence.value)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { leave(if (reducedMotion) 0 else TAP_LEAVE_MS) },
        contentAlignment = Alignment.Center,
    ) {
        SunDisc(modifier = Modifier.scale(0.85f + 0.15f * state.presence.value))
    }
}

/**
 * The bell's light, over the whole screen: a light dim that comes and goes
 * with the sun ([BellSunState.presence]) - the world quiets while the bell
 * rings - with a clear circle around the sun, and the strike's halo spreading
 * from it.
 *
 * [center] is the ringing sun's centre and [sunRadiusPx] its radius, in this
 * window's pixels; [haloRadiusPx] is how far the swell reaches. [isHosted]
 * when the bell rings through a sun already on screen (the Little Sun, the
 * widget's sun): the light then starts at that sun's rim. This window sits
 * above that sun (the widget's launcher always lies beneath every overlay), so
 * a light filling the middle would wash the sun out.
 *
 * Drawn through a window held at 0.8 alpha so touches pass through
 * (BellSunWindow.HALO_WINDOW_ALPHA); the alphas below are set for that.
 */
@Composable
fun BellSunHalo(
    state: BellSunState,
    center: Offset,
    haloRadiusPx: Float,
    sunRadiusPx: Float,
    isHosted: Boolean = false,
) {
    val glowColor = if (isDarkModeNow()) GLOW_COLOR_NIGHT else GLOW_COLOR
    Canvas(modifier = Modifier.fillMaxSize()) {
        val p = state.presence.value
        if (p <= 0f) return@Canvas

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
        val radius = haloRadiusPx * (0.55f + 0.45f * s)
        // Feathered to transparent well inside its reach, so nothing cuts the
        // light; these stops read as 0.75 / 0.35 through the window's alpha.
        val stops = if (!isHosted) {
            arrayOf(
                0.2f to glowColor.copy(alpha = 0.94f * s * p),
                0.5f to glowColor.copy(alpha = 0.44f * s * p),
                1f to Color.Transparent,
            )
        } else {
            val rim = (sunRadiusPx / radius).coerceIn(0.05f, 0.9f)
            arrayOf(
                0f to Color.Transparent,
                rim * 0.85f to Color.Transparent,
                rim to glowColor.copy(alpha = 0.94f * s * p),
                (rim + (1f - rim) * 0.4f) to glowColor.copy(alpha = 0.44f * s * p),
                1f to Color.Transparent,
            )
        }
        drawCircle(
            Brush.radialGradient(colorStops = stops, center = center, radius = radius),
            radius = radius,
            center = center,
        )
    }
}

// The dim's depth as seen (0.35) through the light window's 0.8 alpha.
private const val DIM_ALPHA = 0.44f
private val DIM_COLOR = Color.Black
// The dim is clear out to this many sun radii, and full from this many.
private const val DIM_CLEAR_RADII = 1.4f
private const val DIM_FULL_RADII = 4f

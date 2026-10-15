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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.minded.minded.util.isDarkModeNow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** The bell window's side: the disc's 60dp glow box plus room for the swell. */
val BELL_SUN_BOX = 132.dp

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
 * The mindfulness bell's sun (#298): it appears over whatever the user is
 * doing, rings once, and leaves on its own. No words, nothing to do.
 *
 * The bell must work fully without sound - many phones are muted most of the
 * day - so the visual *is* the bell: at the strike the sun's halo swells once
 * and then fades over the bell's decay ([decayMs]), the way a struck tone
 * fades into silence. The practice is to watch the light settle until it's
 * gone. One swell, never repeating: a repeating pulse would be the unguided
 * "breathing" the companion sun must never carry.
 *
 * Colour: the sun stands on someone else's app, a background we don't
 * control, so it wears the Little Sun's amber halo ([SunDisc] with
 * onOwnSky = false; the moon's cool halo at night) - THE HALO RULE in
 * sunSettle.ts. The swell is that same halo, brighter, never a second colour.
 *
 * With animations removed system-wide nothing moves: the swell holds as a
 * still, brighter halo for the decay and then is gone.
 */
@Composable
fun BellSun(
    decayMs: Int,
    onStrike: () -> Unit,
    onGone: () -> Unit,
) {
    val context = LocalContext.current
    val reducedMotion = remember {
        Settings.Global.getFloat(
            context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        ) == 0f
    }
    val presence = remember { Animatable(0f) }
    val swell = remember { Animatable(0f) }
    var isLeaving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun leave(durationMs: Int) {
        if (isLeaving) return
        isLeaving = true
        scope.launch {
            presence.animateTo(0f, tween(durationMs, easing = FastOutSlowInEasing))
            onGone()
        }
    }

    LaunchedEffect(Unit) {
        if (reducedMotion) {
            presence.snapTo(1f)
            onStrike()
            swell.snapTo(0.6f)
            delay(decayMs.toLong())
            swell.snapTo(0f)
        } else {
            presence.animateTo(1f, tween(ARRIVE_MS, easing = FastOutSlowInEasing))
            if (isLeaving) return@LaunchedEffect
            onStrike()
            swell.animateTo(1f, tween(SWELL_RISE_MS, easing = FastOutSlowInEasing))
            // The long tail of a struck bell: most of the light goes early, the
            // last of it lingers.
            swell.animateTo(
                0f,
                tween((decayMs - SWELL_RISE_MS).coerceAtLeast(0), easing = LinearOutSlowInEasing),
            )
            delay(LINGER_MS.toLong())
        }
        leave(if (reducedMotion) 0 else LEAVE_MS)
    }

    val glowColor = if (isDarkModeNow()) GLOW_COLOR_NIGHT else GLOW_COLOR
    Box(
        modifier = Modifier
            .size(BELL_SUN_BOX)
            .alpha(presence.value)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { leave(if (reducedMotion) 0 else TAP_LEAVE_MS) },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size(BELL_SUN_BOX)) {
            val s = swell.value
            if (s <= 0f) return@Canvas
            // From the disc's own halo edge outward to the box edge, feathered
            // to transparent so the window bounds never cut it.
            drawCircle(
                Brush.radialGradient(
                    colorStops = arrayOf(
                        0.2f to glowColor.copy(alpha = 0.75f * s),
                        0.5f to glowColor.copy(alpha = 0.35f * s),
                        1f to Color.Transparent,
                    ),
                    radius = size.minDimension / 2f * (0.55f + 0.45f * s),
                ),
                radius = size.minDimension / 2f,
            )
        }
        SunDisc(modifier = Modifier.scale(0.85f + 0.15f * presence.value))
    }
}

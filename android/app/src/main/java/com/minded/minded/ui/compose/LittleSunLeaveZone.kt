package com.minded.minded.ui.compose

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.util.isDarkModeNow
import kotlin.math.roundToInt

/**
 * Downward "set" below the horizon - same ease-in-out curve as the in-app sun's
 * downward completion (`animateToCompletion` / `easeInOut`), at the brisk beat
 * the little sun's leave has always used (the exit must feel *wanted*, not
 * slow - CLAUDE.md).
 */
private const val SET_MS = 620

/** The web sun's easeInOut (easeInOutQuad), ported so the set's curve matches. */
private val EaseInOutQuad = Easing { p ->
    if (p < 0.5f) 2f * p * p else 1f - ((-2f * p + 2f) * (-2f * p + 2f)) / 2f
}

/**
 * The little sun's step-away target: a soft horizon glow at the bottom-centre
 * of the screen, shown (in its own non-touchable overlay window) only while the
 * bubble is being dragged - so the leave gesture has a *visible* trigger area
 * instead of an invisible threshold, and parking the bubble anywhere else is
 * never at risk of leaving by accident.
 *
 * While the dragged disc is inside the magnet's capture radius ([armed]) this
 * zone draws the disc itself, sprung onto the magnet centre - the unmistakable
 * "release to step away" state - while the bubble's own disc crossfades out, so
 * there is only ever one sun. Dragging back out hands the disc back the same
 * way. On release inside the zone ([committed]) the sun sets: an ease-in-out
 * sink below the window's bottom edge - which is the physical screen edge, so
 * the clip *is* the horizon - animated entirely inside this window (a
 * frame-synced Compose transform, smooth in a way per-frame overlay-window
 * moves never were).
 *
 * All positions are in this window's local px; geometry comes from
 * [com.minded.minded.overlay.LittleSunPosition] via LittleSunWindow.
 */
@Composable
fun LittleSunLeaveZone(
    elapsedSeconds: Int,
    // Disc captured by the magnet - glow brightens, this zone draws the disc.
    armed: Boolean,
    // Released while armed - play the set (sink below the horizon), then
    // onSetComplete.
    committed: Boolean,
    // The dragged disc's centre under the finger (zone-local px): the snapped
    // disc springs between here and the magnet on capture/release-back.
    fingerDiscCenter: Offset,
    // The magnet centre (zone-local px).
    magnetCenter: Offset,
    onSetComplete: () -> Unit = {},
) {
    val density = LocalDensity.current
    val night = isDarkModeNow()
    val glowColor = if (night) GLOW_COLOR_NIGHT else GLOW_COLOR

    // The horizon glow: quiet while the drag is anywhere, warmer + wider once
    // the disc is captured, gone as the sun finishes setting.
    val glowAlpha by animateFloatAsState(
        targetValue = when {
            committed -> 0f
            armed -> 0.65f
            else -> 0.4f
        },
        animationSpec = tween(durationMillis = if (committed) SET_MS else 250),
        label = "zoneGlowAlpha",
    )
    val glowRadius by animateFloatAsState(
        targetValue = with(density) { (if (armed || committed) 190.dp else 150.dp).toPx() },
        animationSpec = tween(durationMillis = 250),
        label = "zoneGlowRadius",
    )

    val labelAlpha by animateFloatAsState(
        targetValue = if (committed) 0f else 0.95f,
        animationSpec = tween(durationMillis = 300),
        label = "zoneLabelAlpha",
    )

    // The one sun: invisibly tracking the finger until captured, then springing
    // onto the magnet (and back out again if the drag pulls away).
    val onMagnet = armed || committed
    val discX by animateFloatAsState(
        targetValue = if (onMagnet) magnetCenter.x else fingerDiscCenter.x,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "zoneDiscX",
    )
    val discY by animateFloatAsState(
        targetValue = if (onMagnet) magnetCenter.y else fingerDiscCenter.y,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "zoneDiscY",
    )
    val discAlpha by animateFloatAsState(
        targetValue = if (onMagnet) 1f else 0f,
        animationSpec = tween(durationMillis = DISC_HANDOFF_FADE_MS),
        label = "zoneDiscAlpha",
    )

    val sink = remember { Animatable(0f) }

    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
        val heightPx = constraints.maxHeight.toFloat()

        LaunchedEffect(committed) {
            if (committed) {
                // Carry the disc and its 60dp glow fully below the bottom edge.
                val target = heightPx - magnetCenter.y + with(density) { 60.dp.toPx() }
                sink.animateTo(
                    targetValue = target,
                    animationSpec = tween(durationMillis = SET_MS, easing = EaseInOutQuad),
                )
                onSetComplete()
            }
        }

        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2f, size.height)
            val radius = glowRadius.coerceAtLeast(1f)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(glowColor.copy(alpha = glowAlpha), Color.Transparent),
                    center = center,
                    radius = radius,
                ),
                radius = radius,
                center = center,
            )
        }

        // One quiet label naming what the drop does; the zone is full-width and
        // the magnet is centred, so a centred line sits right above the glow.
        Text(
            text = "Step away",
            modifier = Modifier
                .fillMaxWidth()
                .offset {
                    // Clamp so an unusually deep bottom inset can't push the
                    // label above the window's top edge.
                    val y = (magnetCenter.y - 96.dp.toPx()).roundToInt()
                    IntOffset(0, y.coerceAtLeast(0))
                }
                .graphicsLayer { alpha = labelAlpha },
            textAlign = TextAlign.Center,
            fontSize = 13.sp,
            color = Color.White,
            style = TextStyle(
                shadow = Shadow(color = Color.Black.copy(alpha = 0.4f), blurRadius = 10f),
            ),
        )

        Box(
            modifier = Modifier
                .offset {
                    val glowHalf = with(density) { 30.dp.toPx() }
                    IntOffset(
                        (discX - glowHalf).roundToInt(),
                        (discY - glowHalf + sink.value).roundToInt(),
                    )
                }
                .alpha(discAlpha),
        ) {
            SunDisc(clockString = littleSunClockString(elapsedSeconds))
        }
    }
}

@Preview(widthDp = 360, heightDp = 240)
@Composable
fun LittleSunLeaveZonePreview() {
    Box(modifier = Modifier.fillMaxSize()) {
        LittleSunLeaveZone(
            elapsedSeconds = 754,
            armed = true,
            committed = false,
            fingerDiscCenter = Offset(180f * 3, 60f * 3),
            magnetCenter = Offset(180f * 3, 140f * 3),
        )
    }
}

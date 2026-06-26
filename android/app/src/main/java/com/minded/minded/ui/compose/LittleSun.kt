package com.minded.minded.ui.compose

import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.systemGestureExclusion
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import com.minded.minded.util.isDarkModeNow
import kotlin.math.abs
import kotlinx.coroutines.delay

// Match the web extension's little sun: a solid white disc with a soft, warm
// amber glow around it.
private val SUN_COLOR = Color.White
private val SUN_TEXT_COLOR = Color(0xFF956969)
// Warm amber-gold, leaning a touch more toward yellow than the web little
// sun's #e9843a (a more golden glow reads softer and sunnier).
private val GLOW_COLOR = Color(0xFFE99A3A)

// At night the companion is the moon, not a warm sun — so the little sun
// mirrors the in-app moon (web Sun.scss .moon): a cool silver disc with a cool
// blue halo instead of the daytime amber glow, so it belongs in the night sky
// rather than reading as an out-of-place orange dot.
private val SUN_COLOR_NIGHT = Color(0xFFEEF2FF)
private val SUN_TEXT_COLOR_NIGHT = Color(0xFF33405E)
private val GLOW_COLOR_NIGHT = Color(0xFFBED2FF)

/**
 * A quick flick of the sun in any direction sends it away — the universal
 * "tapping/flinging it is the escape hatch" gesture (CLAUDE.md). A release
 * velocity past this (dp/s) reads as a deliberate fling rather than a slow
 * reposition of the bubble.
 */
private const val FLING_LEAVE_DP_PER_S = 1100f

/**
 * A deliberate, predominantly-downward pull past this (dp) sets the sun down —
 * the calm step-away into minded, the same drag-down the dashboard sun uses.
 * Kept well past a casual nudge so the bubble can still be parked lower on
 * screen without leaving.
 */
private const val DRAG_DOWN_LEAVE_DP = 140f

/**
 * The sun's soft set on a committed leave: it eases out in place — a gentle
 * shrink + fade as minded comes forward behind it — never a hard cut (CLAUDE.md
 * "all transitions fade/morph"). Kept short since minded is already being
 * brought to the front underneath while this plays.
 */
private const val LEAVE_MS = 380

/**
 * The little sun overlay: a small, draggable companion bubble (like a chat-head)
 * resting over a blocked app. The app underneath stays fully interactive — the
 * window only intercepts touches within the bubble's own bounds.
 *
 * It is both the gentle presence and the escape hatch, and it offers to step
 * away *on the bubble itself* — no separate full-screen pause to expand into.
 * Two gestures leave (both end in minded, the calm redirect):
 *  - **fling** it in any direction — the instant, light escape hatch, or
 *  - **drag it down** past a threshold — the deliberate, calm set, matching the
 *    dashboard sun's drag-down.
 * Any gentler drag just repositions the bubble; a plain tap does nothing (so a
 * stray touch neither ejects the user nor detonates a surface).
 */
@Composable
fun LittleSun(
    elapsedSeconds: Int = 0,
    onDrag: (dxPx: Float, dyPx: Float) -> Unit = { _, _ -> },
    onDragEnd: () -> Unit = {},
    // Fired the instant a leave commits, before the sun finishes setting: it
    // brings minded to the front behind the fading sun, so the app is ready as
    // the sun winks out (no blocked-app flash, no hard cut).
    onLeaving: () -> Unit = {},
    // Fired once the sun has set: the (now-invisible) overlay window is removed.
    onStepAway: () -> Unit = {},
) {
    val showText = elapsedSeconds >= 0
    val minutes = if (showText) elapsedSeconds / 60 else 0
    val remainingSeconds = if (showText) elapsedSeconds % 60 else 0
    val clockString = if (showText) String.format("%2d:%02d", minutes, remainingSeconds) else ""

    val view = LocalView.current
    val density = LocalDensity.current

    // A committed leave: the sun eases out (shrink + fade) in place, minded is
    // brought forward behind it, then the spent window is removed. Once set, all
    // further gestures are locked out.
    var leaving by remember { mutableStateOf(false) }
    val leaveProgress by animateFloatAsState(
        targetValue = if (leaving) 1f else 0f,
        animationSpec = tween(durationMillis = LEAVE_MS, easing = FastOutSlowInEasing),
        label = "littleSunLeave",
    )
    LaunchedEffect(leaving) {
        if (leaving) {
            onLeaving() // bring minded to the front now, behind the fading sun
            delay(LEAVE_MS.toLong())
            onStepAway() // the sun has set — remove the now-invisible window
        }
    }

    // Fling vs drag-down thresholds, in density-independent terms.
    val flingThresholdPx = with(density) { FLING_LEAVE_DP_PER_S.dp.toPx() }
    val dragDownThresholdPx = with(density) { DRAG_DOWN_LEAVE_DP.dp.toPx() }
    // Reconstruct the finger's own trajectory for the fling read: the window
    // chases the finger during a drag (onDrag repositions it), so the pointer's
    // *local* position barely moves and can't measure velocity. Accumulating the
    // raw drag deltas recovers the real motion regardless of the window moving.
    val velocityTracker = remember { VelocityTracker() }
    var dragAccum by remember { mutableStateOf(Offset.Zero) }

    Box(
        modifier = Modifier
            .size(60.dp)
            .alpha(1f - leaveProgress)
            .scale(lerp(1f, 0.6f, leaveProgress))
            // Claim the bubble's bounds from system gestures so a drag that
            // starts near a screen edge stays ours instead of triggering the
            // system back-gesture (no-op below API 29).
            .systemGestureExclusion()
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = {
                        velocityTracker.resetTracking()
                        dragAccum = Offset.Zero
                    },
                    onDrag = { change, dragAmount ->
                        if (!leaving) {
                            change.consume()
                            dragAccum += dragAmount
                            velocityTracker.addPosition(change.uptimeMillis, dragAccum)
                            // Move the overlay live so the sun follows the finger.
                            onDrag(dragAmount.x, dragAmount.y)
                        }
                    },
                    onDragEnd = {
                        if (!leaving) {
                            val v = velocityTracker.calculateVelocity()
                            // Compare squared magnitudes — avoids a Float sqrt.
                            val speedSq = v.x * v.x + v.y * v.y
                            val down = dragAccum.y
                            val flung = speedSq >= flingThresholdPx * flingThresholdPx
                            // A deliberate, predominantly-downward pull (so a
                            // sideways/upward reposition never leaves by accident).
                            val pulledDown = down >= dragDownThresholdPx && down > abs(dragAccum.x)
                            if (flung || pulledDown) {
                                // A soft tick confirms the deliberate, chosen leave.
                                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                leaving = true
                            } else {
                                // Rest wherever it was dropped — a free-floating
                                // companion, parkable anywhere.
                                onDragEnd()
                            }
                        }
                    },
                    onDragCancel = {
                        if (!leaving) onDragEnd()
                    },
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        SunDisc(clockString = clockString)
    }
}

@Composable
internal fun SunDisc(
    clockString: String = "",
    glowSize: Dp = 60.dp,
    discSize: Dp = 30.dp,
    scale: Float = 1f,
    modifier: Modifier = Modifier,
) {
    // At night the companion becomes the moon — cool silver body, cool halo —
    // matching the in-app sun, which is also a moon after dark.
    val night = isDarkModeNow()
    val glowColor = if (night) GLOW_COLOR_NIGHT else GLOW_COLOR
    val bodyColor = if (night) SUN_COLOR_NIGHT else SUN_COLOR
    val textColor = if (night) SUN_TEXT_COLOR_NIGHT else SUN_TEXT_COLOR

    Box(
        modifier = modifier
            .size(glowSize)
            .scale(scale),
        contentAlignment = Alignment.Center,
    ) {
        // Soft glow, drawn behind the disc so only the halo around the body
        // shows — mirrors the web extension's box-shadow glow. The disc radius
        // is 0.5 of the glow radius, so the colour is saturated right where the
        // body edge sits and then feathers to fully transparent before the
        // layout bound (0.9), so the wrap-content window never hard-cuts the halo.
        val glowBrush = Brush.radialGradient(
            colorStops = arrayOf(
                0.5f to glowColor.copy(alpha = 0.85f),
                0.7f to glowColor.copy(alpha = 0.30f),
                0.9f to Color.Transparent,
            ),
        )
        Canvas(
            modifier = Modifier.size(glowSize),
            onDraw = { drawCircle(glowBrush) },
        )

        // Solid, opaque sun/moon body.
        Box(
            modifier = Modifier
                .size(discSize)
                .clip(CircleShape)
                .background(bodyColor),
            contentAlignment = Alignment.Center,
        ) {
            if (clockString.isNotEmpty()) {
                Text(
                    text = clockString,
                    fontSize = 10.sp,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Bold,
                    color = textColor,
                    maxLines = 1,
                )
            }
        }
    }
}


@Preview
@Composable
fun LittleSunPreview() {
    Surface(color = Color.White) {
        LittleSun(elapsedSeconds = 1000)
    }
}

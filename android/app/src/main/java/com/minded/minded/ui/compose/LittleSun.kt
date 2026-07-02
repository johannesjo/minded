package com.minded.minded.ui.compose

import android.view.HapticFeedbackConstants
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
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.util.isDarkModeNow
import kotlin.math.abs
import kotlin.math.pow
import kotlin.math.sqrt

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

// ---------------------------------------------------------------------------
// Leave gestures: ported 1:1 from the web sun (sunAnimationUtils.ts) so the
// little sun reads a fling / drag-down and animates its exit exactly like the
// in-app sun. The web works in CSS px, which map to dp here. The one difference
// is *where* the motion is applied: the in-app sun translates a disc inside a
// full-viewport surface, whereas the little sun has no surface — so it carries
// the disc off-screen by moving its own wrap-content overlay *window* (see
// onLeaveMove), needing no extra/full-screen overlay.
// ---------------------------------------------------------------------------

// Release thresholds — mirror getSunReleaseAction / its constants.
private const val DRAG_THRESHOLD_DP = 100f // slow drag past this (downward) "sets" the sun
private const val FLING_VELOCITY_THRESHOLD_DP_S = 200f // release speed that reads as a fling
private const val FLING_MIN_DISTANCE_DP = 75f // a fling must also have travelled this far

// Fling physics — mirror FLING_ANIMATION_CONFIG + updatePhysics.
private const val FLING_FRICTION = 0.98f // velocity decay, applied per (dt*60) frames
private const val FLING_ROTATION_FACTOR = 0.0005f
private const val FLING_MAX_MS = 1500L // safety cap; the throw normally ends as it leaves the screen

/**
 * Downward "set" — mirror animateToCompletion("down"): an ease-in-out sink off
 * the bottom edge, the calm deliberate leave. The web runs this over 3s inside a
 * full viewport; on the little overlay we keep the snappier beat the prior
 * little-sun set used (the exit must feel *wanted*, not slow — CLAUDE.md), so the
 * easing curve + direction are mirrored while the duration stays brisk.
 */
private const val SET_MS = 620L

/** The web's easeInOut (easeInOutQuad), ported so the set's curve matches exactly. */
private fun easeInOutQuad(p: Float): Float =
    if (p < 0.5f) 2f * p * p else 1f - ((-2f * p + 2f) * (-2f * p + 2f)) / 2f

private enum class LeaveKind { FLING, SET }

/**
 * The little sun overlay: a small, draggable companion bubble (like a chat-head)
 * resting over a blocked app. The app underneath stays fully interactive — the
 * window only intercepts touches within the bubble's own bounds.
 *
 * It is both the gentle presence and the escape hatch, and it offers to step
 * away *on the bubble itself* — no separate full-screen pause. Two gestures
 * leave (both end in minded, both animated exactly like the in-app sun):
 *  - **fling** it (a quick vertical flick) — a physics throw off-screen in the
 *    fling's direction (mirrors the web sun's `animateFling`), the universal
 *    "fling it" escape hatch from `CLAUDE.md`.
 *  - **drag it down** past a threshold — an ease-in-out sink off the bottom
 *    (mirrors the web sun's downward `animateToCompletion`), the deliberate set.
 * Any gentler / sideways / upward drag just repositions the bubble; a plain tap
 * does nothing (so a stray touch neither ejects the user nor detonates a surface).
 */
@Composable
fun LittleSun(
    elapsedSeconds: Int = 0,
    onDrag: (dxPx: Float, dyPx: Float) -> Unit = { _, _ -> },
    onDragEnd: () -> Unit = {},
    // Fired the instant a leave commits, before the sun has gone: it brings minded
    // to the front behind the leaving sun, so the app is ready as the disc clears
    // the screen (no blocked-app flash, no hard cut).
    onLeaving: () -> Unit = {},
    // Per-frame, unclamped move of the overlay window during a leave so the disc
    // can travel off-screen (the resting drag clamps to keep the bubble on-screen,
    // which a leave must not).
    onLeaveMove: (dxPx: Float, dyPx: Float) -> Unit = { _, _ -> },
    // Fired once the disc has left the screen: the spent window is removed.
    onStepAway: () -> Unit = {},
) {
    val showText = elapsedSeconds >= 0
    val minutes = if (showText) elapsedSeconds / 60 else 0
    val remainingSeconds = if (showText) elapsedSeconds % 60 else 0
    val clockString = if (showText) String.format("%2d:%02d", minutes, remainingSeconds) else ""

    val view = LocalView.current
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val screenWidthPx = with(density) { configuration.screenWidthDp.dp.toPx() }
    val screenHeightPx = with(density) { configuration.screenHeightDp.dp.toPx() }
    // Enough extra travel to carry the disc *and* its 60dp glow fully off-screen.
    val offScreenMarginPx = with(density) { 120.dp.toPx() }

    // A committed leave and (for a fling) the release velocity that drives it.
    var leaveKind by remember { mutableStateOf<LeaveKind?>(null) }
    var flingVx by remember { mutableStateOf(0f) }
    var flingVy by remember { mutableStateOf(0f) }
    val leaving = leaveKind != null

    // Visual state the leave animations drive; identity values while at rest.
    var leaveScale by remember { mutableStateOf(1f) }
    var leaveAlpha by remember { mutableStateOf(1f) }
    var leaveRotation by remember { mutableStateOf(0f) }

    LaunchedEffect(leaveKind) {
        val kind = leaveKind ?: return@LaunchedEffect
        onLeaving() // bring minded forward behind the leaving sun
        when (kind) {
            // Drag-down set: ease-in-out sink straight off the bottom edge,
            // staying opaque as it dips below the horizon (mirrors the web sun's
            // downward completion, which exits by translation).
            LeaveKind.SET -> {
                val totalDy = screenHeightPx + offScreenMarginPx
                val startNs = withFrameNanos { it }
                var movedY = 0f
                while (true) {
                    val now = withFrameNanos { it }
                    val t = ((now - startNs).toFloat() / (SET_MS * 1_000_000f)).coerceIn(0f, 1f)
                    val target = totalDy * easeInOutQuad(t)
                    onLeaveMove(0f, target - movedY)
                    movedY = target
                    if (t >= 1f) break
                }
            }
            // Fling: integrate the release velocity with friction decay, shrinking
            // and fading the disc with distance and spinning it slightly — the web
            // sun's `updatePhysics`, applied to the window's position.
            LeaveKind.FLING -> {
                var vx = flingVx
                var vy = flingVy
                var cumX = 0f
                var cumY = 0f
                val maxDistance = maxOf(screenWidthPx, screenHeightPx)
                val startNs = withFrameNanos { it }
                var lastNs = startNs
                while (true) {
                    val now = withFrameNanos { it }
                    // Clamp dt so a dropped frame can't teleport the disc.
                    val dt = ((now - lastNs).toFloat() / 1_000_000_000f).coerceAtMost(0.05f)
                    lastNs = now
                    val decay = FLING_FRICTION.toDouble().pow((dt * 60f).toDouble()).toFloat()
                    vx *= decay
                    vy *= decay
                    val dx = vx * dt
                    val dy = vy * dt
                    cumX += dx
                    cumY += dy
                    onLeaveMove(dx, dy)

                    val distance = sqrt((cumX * cumX + cumY * cumY).toDouble()).toFloat()
                    val distanceProgress = (distance / maxDistance).coerceIn(0f, 1f)
                    leaveScale = 1f - distanceProgress * 0.5f
                    // Distance-based opacity (mirror updatePhysics: full when flinging
                    // upward), floored by a time fade so a weak, barely-threshold fling
                    // that never quite clears the screen still ends invisible rather
                    // than popping out on teardown — a strong fling is long off-screen
                    // before the time fade matters.
                    val elapsedMs = (now - startNs) / 1_000_000L
                    val physicsAlpha = if (vy < 0f) 1f else (1f - distanceProgress * 0.8f).coerceIn(0f, 1f)
                    val timeFade = (1f - elapsedMs.toFloat() / FLING_MAX_MS).coerceIn(0f, 1f)
                    leaveAlpha = minOf(physicsAlpha, timeFade)
                    leaveRotation += vx * FLING_ROTATION_FACTOR * dt

                    val offScreen = cumY > screenHeightPx + offScreenMarginPx ||
                        cumY < -(screenHeightPx + offScreenMarginPx) ||
                        cumX > screenWidthPx + offScreenMarginPx ||
                        cumX < -(screenWidthPx + offScreenMarginPx)
                    if (offScreen || elapsedMs >= FLING_MAX_MS) break
                }
            }
        }
        onStepAway() // the disc has left — remove the spent window
    }

    val flingThresholdPx = with(density) { FLING_VELOCITY_THRESHOLD_DP_S.dp.toPx() }
    val dragThresholdPx = with(density) { DRAG_THRESHOLD_DP.dp.toPx() }
    val flingMinDistancePx = with(density) { FLING_MIN_DISTANCE_DP.dp.toPx() }
    // Reconstruct the finger's own trajectory: the window chases the finger during
    // a drag (onDrag repositions it), so the pointer's *local* position barely
    // moves and can't measure velocity. Accumulating the raw drag deltas recovers
    // the real motion regardless of the window moving.
    val velocityTracker = remember { VelocityTracker() }
    var dragAccum by remember { mutableStateOf(Offset.Zero) }

    Box(
        modifier = Modifier
            .size(60.dp)
            .alpha(leaveAlpha)
            .scale(leaveScale)
            .rotate(leaveRotation)
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
                            val offset = dragAccum
                            val vMagnitude = sqrt(v.x * v.x + v.y * v.y)
                            val verticalFlingIntent = abs(v.y) >= abs(v.x)
                            val verticalDragIntent = abs(offset.y) >= abs(offset.x)
                            // Mirror getSunReleaseAction: a fast release without
                            // vertical intent is a confused gesture — rest, never
                            // leave (guards a hurried sideways flick at the end of a
                            // downward pull from committing an accidental step-away).
                            val confusedRelease =
                                vMagnitude >= flingThresholdPx && !verticalFlingIntent
                            // A fast vertical flick that also travelled far enough is
                            // a fling (up or down); a slow downward pull past the
                            // threshold is the set.
                            val isFling = abs(v.y) >= flingThresholdPx &&
                                abs(offset.y) >= flingMinDistancePx &&
                                verticalFlingIntent && verticalDragIntent
                            val isSetDown = !confusedRelease &&
                                offset.y >= dragThresholdPx && verticalDragIntent
                            when {
                                isFling -> {
                                    // A soft tick confirms the deliberate, chosen leave.
                                    view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                    flingVx = v.x
                                    flingVy = v.y
                                    leaveKind = LeaveKind.FLING
                                }
                                isSetDown -> {
                                    view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                                    leaveKind = LeaveKind.SET
                                }
                                // Everything else (sideways / upward / short) just
                                // rests where it was dropped — a parkable companion.
                                else -> onDragEnd()
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

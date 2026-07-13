package com.minded.minded.ui.compose

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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.util.isDarkModeNow

// Match the web extension's little sun: a solid white disc with a soft, warm
// amber glow around it.
private val SUN_COLOR = Color.White
private val SUN_TEXT_COLOR = Color(0xFF956969)
// Warm amber-gold, leaning a touch more toward yellow than the web little
// sun's #e9843a (a more golden glow reads softer and sunnier).
internal val GLOW_COLOR = Color(0xFFE99A3A)

// At night the companion is the moon, not a warm sun - so the little sun
// mirrors the in-app moon (web Sun.scss .moon): a cool silver disc with a cool
// blue halo instead of the daytime amber glow, so it belongs in the night sky
// rather than reading as an out-of-place orange dot.
private val SUN_COLOR_NIGHT = Color(0xFFEEF2FF)
private val SUN_TEXT_COLOR_NIGHT = Color(0xFF33405E)
internal val GLOW_COLOR_NIGHT = Color(0xFFBED2FF)

/** The bubble's timer text - shared with the leave zone's snapped disc. */
internal fun littleSunClockString(elapsedSeconds: Int): String =
    if (elapsedSeconds >= 0)
        String.format("%2d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    else ""

/**
 * The little sun overlay: a small, draggable companion bubble (like a chat-head)
 * resting over a blocked app. The app underneath stays fully interactive - the
 * window only intercepts touches within the bubble's own bounds.
 *
 * It is both the gentle presence and the escape hatch, and it offers to step
 * away *on the bubble itself* - while it is being dragged, a soft horizon glow
 * ([LittleSunLeaveZone], its own non-touchable window) appears at the
 * bottom-centre of the screen; carrying the sun into it and releasing lets the
 * sun set below the horizon and opens minded. Any other drag just repositions
 * the bubble (parkable anywhere the clamp allows); a plain tap does nothing (so
 * a stray touch neither ejects the user nor detonates a surface).
 *
 * This composable is only the disc and its drag gesture - the zone, the capture
 * test and the leave commit live in LittleSunWindow, which knows the screen
 * geometry. While the zone holds the disc ([discHidden]), the bubble's own disc
 * crossfades out so there is only ever one visible sun.
 */
@Composable
fun LittleSun(
    elapsedSeconds: Int = 0,
    // True while the leave zone draws the disc snapped to its magnet - the
    // bubble's own disc fades out so the sun never appears twice.
    discHidden: Boolean = false,
    onDragStart: () -> Unit = {},
    onDrag: (dxPx: Float, dyPx: Float) -> Unit = { _, _ -> },
    // Fired on release AND on cancel - the window decides whether the drop
    // rests the bubble or (inside the zone) commits the leave.
    onDragEnd: () -> Unit = {},
) {
    val clockString = littleSunClockString(elapsedSeconds)

    // Soft crossfade, timed with the zone's snapped disc fading in, so the
    // hand-off reads as the one sun hopping to the magnet - never a hard cut.
    val discAlpha by animateFloatAsState(
        targetValue = if (discHidden) 0f else 1f,
        animationSpec = tween(durationMillis = DISC_HANDOFF_FADE_MS),
        label = "littleSunDiscAlpha",
    )

    Box(
        modifier = Modifier
            .size(60.dp)
            .alpha(discAlpha)
            // Claim the bubble's bounds from system gestures so a drag that
            // starts near a screen edge stays ours instead of triggering the
            // system back-gesture (no-op below API 29).
            .systemGestureExclusion()
            .pointerInput(Unit) {
                detectDragGestures(
                    onDragStart = { onDragStart() },
                    onDrag = { change, dragAmount ->
                        change.consume()
                        // Move the overlay live so the sun follows the finger.
                        onDrag(dragAmount.x, dragAmount.y)
                    },
                    onDragEnd = { onDragEnd() },
                    onDragCancel = { onDragEnd() },
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        SunDisc(clockString = clockString)
    }
}

/** Bubble disc ↔ zone disc crossfade duration (both sides use it). */
internal const val DISC_HANDOFF_FADE_MS = 150

@Composable
internal fun SunDisc(
    clockString: String = "",
    glowSize: Dp = 60.dp,
    discSize: Dp = 30.dp,
    scale: Float = 1f,
    modifier: Modifier = Modifier,
) {
    // At night the companion becomes the moon - cool silver body, cool halo -
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
        // shows - mirrors the web extension's box-shadow glow. The disc radius
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

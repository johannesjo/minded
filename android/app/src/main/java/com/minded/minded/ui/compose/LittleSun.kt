package com.minded.minded.ui.compose

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.requiredSize
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
import com.minded.minded.overlay.LittleSunPosition
import com.minded.minded.util.isDarkModeNow

// Match the web extension's little sun: a solid white disc with a soft, warm
// amber glow around it.
private val SUN_COLOR = Color.White
private val SUN_TEXT_COLOR = Color(0xFF956969)
// The one canonical sun amber (#ffd673 == 255,214,115), shared with the web
// little sun's --little-sun-shadow. This amber is the sun's colour wherever it
// stands on a background we DON'T control - here, over arbitrary app content,
// and on the small home-screen widget over the wallpaper - so it announces
// itself as a sun rather than reading as a pale blob. On our own surfaces the
// halo is white, including the widget prompt card, which paints the app's sky
// (ic_sun_widget_day_on_sky.xml). The only in-app state wearing this amber is
// the departing hand-off, mid-morph into this disc, so the two match at the
// swap. See THE HALO RULE in
// extension/src/shared/components/interaction/sun/sunSettle.ts.
internal val GLOW_COLOR = Color(0xFFFFD673)

// The same disc standing on a sky we paint ourselves - today the interaction
// overlay's native loading sky, under the fresh-arrival sun that greets an
// intervention before the WebView has painted. That is our surface like any
// other, so the light it casts is white: it is the same sun the web layer is
// about to draw, and the web sun glows white (settle warmth 0). Amber here made
// every intervention open on an orange halo that turned white at the hand-off -
// a colour change nobody asked for, on the app's most central surface.
//
// White is the disc's colour only while it *stays* on that sky. The same disc is
// also the escape hatch: tapping it morphs it into the Little Sun, and there it
// warms back to GLOW_COLOR across the glide, because by then it is mid-morph
// onto someone else's app. The warming is the hand-off, exactly as on the web.
internal val GLOW_COLOR_OWN_SKY = Color.White

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
 * a stray touch neither ejects the user nor detonates a surface). A double tap
 * shrinks the sun to its [mini] size, so it covers less of the app beneath,
 * and the next double tap grows it back - always eased in place, never a cut.
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
    // The double-tapped small size. The window resizes around this (see
    // LittleSunWindow.toggleMini); here the disc only eases between scales,
    // centred in whatever box the window currently gives it.
    mini: Boolean = false,
    onDoubleTap: () -> Unit = {},
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
    val discScale by animateFloatAsState(
        targetValue = if (mini) LittleSunPosition.MINI_SCALE else 1f,
        animationSpec = tween(durationMillis = MINI_MORPH_MS),
        label = "littleSunMiniScale",
    )
    // The clock is unreadable at the mini size - let it fade with the shrink.
    val clockAlpha by animateFloatAsState(
        targetValue = if (mini) 0f else 1f,
        animationSpec = tween(durationMillis = MINI_MORPH_MS),
        label = "littleSunClockAlpha",
    )

    Box(
        modifier = Modifier
            // The window is sized exactly to the bubble (full or mini).
            .fillMaxSize()
            .alpha(discAlpha)
            // Claim the bubble's bounds from system gestures so a drag that
            // starts near a screen edge stays ours instead of triggering the
            // system back-gesture (no-op below API 29).
            .systemGestureExclusion()
            // Double tap only - no onTap, so a single tap still does nothing. A
            // drag consumes its moves first, which cancels the tap here.
            .pointerInput(Unit) {
                detectTapGestures(onDoubleTap = { onDoubleTap() })
            }
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
        SunDisc(
            clockString = clockString,
            scale = discScale,
            clockAlpha = clockAlpha,
            // Full-size box, centred: while the window is mini it simply
            // overhangs (the scaled-down sun still fits inside).
            modifier = Modifier.requiredSize(60.dp),
        )
    }
}

/** Bubble disc ↔ zone disc crossfade duration (both sides use it). */
internal const val DISC_HANDOFF_FADE_MS = 150

/** Full ↔ mini shrink/grow duration. */
const val MINI_MORPH_MS = 300

@Composable
internal fun SunDisc(
    clockString: String = "",
    glowSize: Dp = 60.dp,
    discSize: Dp = 30.dp,
    scale: Float = 1f,
    // True when this disc stands on a sky WE paint (the interaction overlay's
    // native loading sky) rather than on arbitrary app content. THE HALO RULE:
    // the test is what the sun stands on, not which process draws it - on our
    // own sky the halo is white, exactly like the web sun this disc cross-fades
    // into. Amber is only for backgrounds we don't control, where a white halo
    // would read as a pale blob. Mirrors the widget's `onOwnSky` split
    // (MyAppWidget.drawableFor / CompanionSun).
    //
    // It is a *state*, not a fixed property of a call site: one disc can start on
    // our sky and then morph into the Little Sun, and flipping this mid-life
    // warms it across that morph - the way the web's departing settle does.
    onOwnSky: Boolean = false,
    // How long a change of `onOwnSky` (or of day/night) takes to ease from one
    // halo colour to the next. Never a hard cut: the warming IS the hand-off, so
    // a caller morphing into the Little Sun passes its glide duration and the
    // colour arrives exactly as the disc lands.
    glowMorphMs: Int = DISC_HANDOFF_FADE_MS,
    clockAlpha: Float = 1f,
    modifier: Modifier = Modifier,
) {
    // At night the companion becomes the moon - cool silver body, cool halo -
    // matching the in-app sun, which is also a moon after dark. The moon never
    // warms on any surface, so `onOwnSky` changes nothing after dark: its cool
    // halo is already what the web moon wears on our own sky.
    val night = isDarkModeNow()
    val targetGlowColor = when {
        night -> GLOW_COLOR_NIGHT
        onOwnSky -> GLOW_COLOR_OWN_SKY
        else -> GLOW_COLOR
    }
    val glowColor by animateColorAsState(
        targetValue = targetGlowColor,
        animationSpec = tween(durationMillis = glowMorphMs),
        label = "sunDiscGlowColor",
    )
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
                    color = textColor.copy(alpha = clockAlpha),
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
        Box(modifier = Modifier.size(60.dp)) {
            LittleSun(elapsedSeconds = 1000)
        }
    }
}

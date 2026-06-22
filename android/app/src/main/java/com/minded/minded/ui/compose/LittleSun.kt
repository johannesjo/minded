package com.minded.minded.ui.compose

import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.util.lerp
import kotlin.math.roundToInt
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Match the web extension's little sun: a solid white disc with a soft, warm
// amber glow around it.
private val SUN_COLOR = Color.White
private val SUN_TEXT_COLOR = Color(0xFF956969)
// Warm amber-gold, leaning a touch more toward yellow than the web little
// sun's #e9843a (a more golden glow reads softer and sunnier).
private val GLOW_COLOR = Color(0xFFE99A3A)

// The cool dusk-into-night sky the sun sets into when the pause is pulled down,
// matching the web interaction's dark-mode sunset gradient
// (BackgroundTransition.scss): a deep, calm blue, never harsh.
private val NIGHT_SKY_COLORS = listOf(
    Color(0xFF020C25),
    Color(0xFF041735),
    Color(0xFF07244F),
    Color(0xFF05214E),
)

/**
 * Delay from the moment the pause opens (the expand starts) until the gentle
 * step-away invitation fades in — timed to land just as the little→big expand
 * (EXPAND_MS) finishes, so the buttons arrive with the settled sun rather than
 * long after it. The pause *is* the friction — the sun is the pause (see
 * CLAUDE.md) — and a short beat still makes an accidental tap harmless: there's
 * a moment to pull down / tap off before anything is asked.
 */
private const val PAUSE_MS = 600L

/**
 * A gentle offer never nags: if left untouched the invitation fades on its
 * own and the sun returns to its resting bubble. Matches the auto-dismiss of
 * the web grounding / let-go offers.
 */
private const val OFFER_AUTO_DISMISS_MS = 15000L

/** Fade applied when the surface eases out, and when the bubble eases back in. */
private const val FADE_MS = 400

/**
 * On a stay-dismiss (Not now / tap-off / ignored) the sun first glides home over
 * FADE_MS, then fades out at the corner over this. The fade lets the overlay
 * window resize from full-screen back to the little bubble *behind* an invisible
 * sun — so the resize never shows as a jump — before the resting bubble fades in.
 * A soft hand-off, never a hard cut (per CLAUDE.md).
 */
private const val CROSSFADE_MS = 280

/**
 * The expanded pause is user-invoked, so the dim should answer the tap promptly
 * — a quick fade-in, far shorter than the calm fade-out, while still easing in
 * (never a hard cut, per CLAUDE.md).
 */
private const val APPEAR_FADE_MS = 160

/**
 * On tap the pause-sun isn't a new element — it's the little resting sun
 * *expanding*: it starts pixel-matched to the bubble (same size, same spot) and
 * travels to screen-centre as it grows to full size. 0.33 ≈ the little sun's
 * 60dp glow over the big 180dp glow, so the first frame matches the bubble.
 */
private const val BIG_SUN_ENTER_SCALE = 0.33f

/** Little→big expand: travel + grow. Slow and deliberate — it *is* the pause,
 *  so it eases open rather than snapping, then holds still (no pulsing). */
private const val EXPAND_MS = 600

/**
 * The little sun overlay. At rest it is a small, draggable companion bubble
 * (like a chat-head) that lets the app underneath stay fully interactive —
 * the window only intercepts touches within the bubble's own bounds. Tapping
 * it does not eject the user; it opens a calm pause and a soft "step away?"
 * invitation that can always be ignored.
 */
@Composable
fun LittleSun(
    elapsedSeconds: Int = 0,
    expanded: Boolean = false,
    isInitiallyVisible: Boolean = false,
    // When the bubble reappears after the offer collapses it should fade back
    // in, never snap. On the very first show it appears in place (the departing
    // interaction sun has just glided to this corner), so no fade then.
    enterFade: Boolean = false,
    // Screen-px centre of the resting bubble at the moment of tap, so the pause
    // sun can expand *out of* it. -1 = unknown (e.g. preview): centre-bloom only.
    expandFromX: Int = -1,
    expandFromY: Int = -1,
    onTap: () -> Unit = {},
    onDrag: (dxPx: Float, dyPx: Float) -> Unit = { _, _ -> },
    onDragEnd: () -> Unit = {},
    onStepAway: () -> Unit = {},
    onStay: () -> Unit = {},
) {
    if (expanded) {
        StepAwayOffer(
            expandFromX = expandFromX,
            expandFromY = expandFromY,
            onStepAway = onStepAway,
            onStay = onStay,
        )
    } else {
        Bubble(
            elapsedSeconds = elapsedSeconds,
            isInitiallyVisible = isInitiallyVisible,
            enterFade = enterFade,
            onTap = onTap,
            onDrag = onDrag,
            onDragEnd = onDragEnd,
        )
    }
}

@Composable
private fun Bubble(
    elapsedSeconds: Int,
    isInitiallyVisible: Boolean,
    enterFade: Boolean,
    onTap: () -> Unit,
    onDrag: (Float, Float) -> Unit,
    onDragEnd: () -> Unit,
) {
    val showText = elapsedSeconds >= 0
    val minutes = if (showText) elapsedSeconds / 60 else 0
    val remainingSeconds = if (showText) elapsedSeconds % 60 else 0
    val clockString = if (showText) String.format("%2d:%02d", minutes, remainingSeconds) else ""

    val view = LocalView.current
    val density = LocalDensity.current
    // Visibility is controlled by alpha alone — the bubble box is ALWAYS laid out so
    // the wrap-content overlay window sizes to it. (Adding/removing the content with
    // AnimatedVisibility collapsed the window to ~0 while hidden, which defeated the
    // resize wait below and let the bubble fade in mid-resize, shifting under it.)
    var revealed by remember { mutableStateOf(isInitiallyVisible) }
    val bubbleAlpha by animateFloatAsState(
        targetValue = if (revealed) 1f else 0f,
        // First show: appear in place (no fade). Returning after a collapse: fade in.
        animationSpec = tween(durationMillis = if (enterFade) FADE_MS else 0),
        label = "bubbleAlpha",
    )

    LaunchedEffect(Unit) {
        // Returning after a collapse, the overlay window shrinks from the full-screen
        // pause back down to the bubble. The (invisible) bubble box is already laid
        // out, so the window wraps to bubble size — wait for that to actually happen,
        // then reveal, so the bubble never appears mid-resize and shifts. Polling the
        // real view width is robust to however long the resize takes on a device; the
        // frame cap is a safety net. The first show has no resize, so it skips this.
        if (enterFade) {
            val restThresholdPx = with(density) { 120.dp.toPx() }
            var frames = 0
            while (view.width > restThresholdPx && frames < 12) {
                withFrameNanos { }
                frames++
            }
        }
        revealed = true
    }

    Box(
        modifier = Modifier
            .alpha(bubbleAlpha)
            .size(60.dp)
            // Claim the bubble's bounds from system gestures so a drag that
            // starts near a screen edge stays ours instead of triggering the
            // system back-gesture (no-op below API 29).
            .systemGestureExclusion()
            // Two separate gesture detectors: a small movement stays a tap
            // (open the pause), a deliberate drag moves the bubble. The drag
            // deltas are handed to the window, which repositions the overlay.
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                        onTap()
                    }
                )
            }
            .pointerInput(Unit) {
                detectDragGestures(
                    onDrag = { change, dragAmount ->
                        change.consume()
                        onDrag(dragAmount.x, dragAmount.y)
                    },
                    onDragEnd = { onDragEnd() },
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        SunDisc(clockString = clockString)
    }
}

@Composable
private fun StepAwayOffer(
    expandFromX: Int,
    expandFromY: Int,
    onStepAway: () -> Unit,
    onStay: () -> Unit,
) {
    // 0 = quiet hold, 1 = invitation shown.
    var phase by remember { mutableStateOf(0) }
    var shown by remember { mutableStateOf(false) }
    var dismissing by remember { mutableStateOf(false) }
    // A "stay" dismiss (Not now / tap-off / ignored) plays the expand in reverse:
    // the sun shrinks and glides back to its bubble corner, then crossfades into
    // the resting bubble. A drag-down close instead sinks the sun off-screen.
    var reverseDismiss by remember { mutableStateOf(false) }
    // Set once the reverse glide-home has landed: the sun fades out at its corner
    // so the window can resize behind it unseen before the bubble fades in.
    var crossfading by remember { mutableStateOf(false) }

    // Soft fade for the whole surface — calmness is the product, never a hard
    // cut. Fades in on appear and out on dismiss.
    val surfaceAlpha by animateFloatAsState(
        targetValue = if (!shown || dismissing) 0f else 1f,
        // Appear quickly on tap; ease out calmly on dismiss.
        animationSpec = tween(durationMillis = if (dismissing) FADE_MS else APPEAR_FADE_MS),
        label = "stepAwaySurfaceAlpha",
    )

    // Hand control back to the resting bubble once the dismiss has played. Driven
    // off the dismissing flag (not an animation finished-listener) so it can't fire
    // on the fade-IN settling and survives the composable leaving. A reverse
    // dismiss adds a crossfade beat: glide home, fade the sun out, then hand off —
    // so the window resize never shows as a jump (see CROSSFADE_MS).
    LaunchedEffect(dismissing) {
        if (dismissing) {
            delay(FADE_MS.toLong()) // glide home / sink away
            if (reverseDismiss) {
                crossfading = true
                delay(CROSSFADE_MS.toLong()) // fade the landed sun out before the resize
            }
            onStay()
        }
    }

    // Drives the little→big expand (travel + grow): 0 = matched to the resting
    // bubble, 1 = full sun at centre. A reverse dismiss runs it back to 0 so the
    // sun shrinks and glides home; other paths leave it at 1.
    val expandProgress by animateFloatAsState(
        targetValue = if (shown && !(dismissing && reverseDismiss)) 1f else 0f,
        animationSpec = tween(
            durationMillis = if (dismissing) FADE_MS else EXPAND_MS,
            easing = FastOutSlowInEasing,
        ),
        label = "stepAwayExpand",
    )

    // The sun is opaque from the first frame — it *is* the little sun (which was
    // opaque), now expanding, so it must not fade in under it. It stays opaque
    // through the glide home; a reverse dismiss only fades it once `crossfading`
    // begins (the soft hand-off). A drag-down close fades it too, but it has
    // already sunk off-screen so the fade is unseen.
    val sunAlpha by animateFloatAsState(
        targetValue = if ((dismissing && !reverseDismiss) || crossfading) 0f else 1f,
        animationSpec = tween(durationMillis = if (dismissing) CROSSFADE_MS else APPEAR_FADE_MS),
        label = "stepAwaySunAlpha",
    )

    val promptAlpha by animateFloatAsState(
        targetValue = if (phase >= 1 && !dismissing) 1f else 0f,
        // Fade the buttons out quickly on dismiss so they don't linger over the
        // returning sun; fade them in promptly once the pause has settled.
        animationSpec = tween(durationMillis = if (dismissing) 200 else 450),
        label = "promptAlpha",
    )

    // Drag-down-to-close: pull the pause downward to dismiss it, the same
    // drag-down-to-let-go gesture the dashboard sun uses. The content follows the
    // finger and fades; released past the threshold it closes (stay), otherwise
    // it springs back.
    val dragY = remember { Animatable(0f) }
    val dragScope = rememberCoroutineScope()
    val dismissDragPx = with(LocalDensity.current) { 140.dp.toPx() }
    // Enough to carry the sun fully off the bottom edge when it sets.
    val screenHeightPx = with(LocalDensity.current) {
        LocalConfiguration.current.screenHeightDp.dp.toPx()
    }
    // 0 = at rest, 1 = pulled to the dismiss threshold. Drives how far the night
    // sky has risen behind the sun — the sun itself stays fully opaque and sets
    // into the sky rather than fading away.
    val dragProgress = (dragY.value / dismissDragPx).coerceIn(0f, 1f)
    val nightSkyBrush = remember { Brush.verticalGradient(NIGHT_SKY_COLORS) }

    fun beginDismiss(reverse: Boolean = false) {
        if (!dismissing) {
            reverseDismiss = reverse
            dismissing = true
        }
    }

    LaunchedEffect(Unit) {
        shown = true
        delay(PAUSE_MS)
        phase = 1
        delay(OFFER_AUTO_DISMISS_MS)
        // Ignored long enough → the sun quietly glides back home.
        beginDismiss(reverse = true)
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.78f * surfaceAlpha))
            // Tapping anywhere off the invitation is the easy way to stay — the
            // sun glides back home.
            .pointerInput(Unit) {
                detectTapGestures(onTap = { beginDismiss(reverse = true) })
            }
            // Pull down to close: the content tracks the finger; released past the
            // threshold it dismisses, otherwise it springs back.
            .pointerInput(Unit) {
                detectVerticalDragGestures(
                    onVerticalDrag = { _, dy ->
                        dragScope.launch { dragY.snapTo((dragY.value + dy).coerceAtLeast(0f)) }
                    },
                    onDragEnd = {
                        if (dragY.value >= dismissDragPx) {
                            // Pulled past the threshold: the sun sets. It sinks the
                            // rest of the way down (staying fully opaque) while the
                            // night sky holds, then the surface fades and the bubble
                            // returns — it never fades out in place.
                            dragScope.launch {
                                dragY.animateTo(
                                    screenHeightPx,
                                    tween(durationMillis = 500, easing = FastOutSlowInEasing),
                                )
                                beginDismiss(reverse = false)
                            }
                        } else {
                            dragScope.launch {
                                dragY.animateTo(
                                    0f,
                                    tween(durationMillis = 240, easing = FastOutSlowInEasing),
                                )
                            }
                        }
                    },
                )
            },
    ) {
        // The night sky rises behind the sun as it is pulled down — the same cool
        // dusk-into-night palette the in-app sun-set uses. Fully out at the dismiss
        // threshold; recedes if the pull is released early. Sits above the dim and
        // below the sun, and fades with the surface on dismiss.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .alpha(surfaceAlpha * dragProgress)
                .background(nightSkyBrush),
        )

        val hasOrigin = expandFromX >= 0 && expandFromY >= 0
        val centrePx = with(LocalDensity.current) {
            Offset(maxWidth.toPx() / 2f, maxHeight.toPx() / 2f)
        }
        // Where the sun starts: the resting bubble's centre (so it expands out of
        // it). Without an origin (e.g. preview) it just grows in place at centre.
        val startCentrePx =
            if (hasOrigin) Offset(expandFromX.toFloat(), expandFromY.toFloat()) else centrePx
        // progress 0 → sit on the old bubble spot; 1 → arrived at centre. offset()
        // is placement-only, so it never disturbs the centred rest position. Once
        // expanded the sun holds still at full size — no breathing/pulsing.
        val sunTravel = (startCentrePx - centrePx) * (1f - expandProgress)
        val sunScaleNow = lerp(BIG_SUN_ENTER_SCALE, 1f, expandProgress)

        SunDisc(
            glowSize = 180.dp,
            discSize = 92.dp,
            scale = sunScaleNow,
            modifier = Modifier
                .align(Alignment.Center)
                .offset {
                    IntOffset(sunTravel.x.roundToInt(), (sunTravel.y + dragY.value).roundToInt())
                }
                .alpha(sunAlpha),
        )

        // No heading, no question — the quiet moment has already passed. A single
        // gentle offer to step away, with a quiet decline; tapping off it, pulling
        // down, or simply waiting also stays. The choice is never pushed. It rests
        // below the centred sun and only fades in once the pause has settled.
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .align(Alignment.Center)
                .offset { IntOffset(0, (150.dp.toPx() + dragY.value).roundToInt()) }
                .alpha(promptAlpha * (1f - dragProgress)),
        ) {
            OfferAction(
                text = "Step away",
                enabled = phase >= 1 && !dismissing,
                onClick = onStepAway,
            )
            Spacer(Modifier.height(8.dp))
            OfferAction(
                text = "Not now",
                dimmed = true,
                enabled = phase >= 1 && !dismissing,
                onClick = { beginDismiss(reverse = true) },
            )
        }
    }
}

@Composable
private fun OfferAction(
    text: String,
    enabled: Boolean,
    onClick: () -> Unit,
    dimmed: Boolean = false,
) {
    val view = LocalView.current
    Text(
        text = text,
        color = Color.White.copy(alpha = if (dimmed) 0.7f else 1f),
        fontSize = 17.sp,
        fontWeight = FontWeight.Medium,
        // A soft drop shadow keeps the white label readable over whatever bright
        // app content shows through the dim, without adding button chrome.
        style = TextStyle(
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.6f),
                offset = Offset(0f, 1f),
                blurRadius = 12f,
            ),
        ),
        modifier = Modifier
            .clip(CircleShape)
            .clickable(enabled = enabled) {
                view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                onClick()
            }
            .padding(horizontal = 28.dp, vertical = 12.dp),
    )
}

@Composable
private fun SunDisc(
    clockString: String = "",
    glowSize: Dp = 60.dp,
    discSize: Dp = 30.dp,
    scale: Float = 1f,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(glowSize)
            .scale(scale),
        contentAlignment = Alignment.Center,
    ) {
        // Soft amber glow, drawn behind the disc so only the warm halo around
        // the white body shows — mirrors the web extension's box-shadow glow.
        // The disc radius is 0.5 of the glow radius, so the amber is saturated
        // right where the white edge sits and then feathers to fully
        // transparent before the layout bound (0.9), so the wrap-content window
        // never hard-cuts the halo.
        val glowBrush = Brush.radialGradient(
            colorStops = arrayOf(
                0.5f to GLOW_COLOR.copy(alpha = 0.85f),
                0.7f to GLOW_COLOR.copy(alpha = 0.30f),
                0.9f to Color.Transparent,
            ),
        )
        Canvas(
            modifier = Modifier.size(glowSize),
            onDraw = { drawCircle(glowBrush) },
        )

        // Solid, opaque white sun body.
        Box(
            modifier = Modifier
                .size(discSize)
                .clip(CircleShape)
                .background(SUN_COLOR),
            contentAlignment = Alignment.Center,
        ) {
            if (clockString.isNotEmpty()) {
                Text(
                    text = clockString,
                    fontSize = 10.sp,
                    textAlign = TextAlign.Center,
                    fontWeight = FontWeight.Bold,
                    color = SUN_TEXT_COLOR,
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
        LittleSun(elapsedSeconds = 1000, isInitiallyVisible = true)
    }
}

@Preview
@Composable
fun LittleSunExpandedPreview() {
    LittleSun(elapsedSeconds = 1000, expanded = true)
}

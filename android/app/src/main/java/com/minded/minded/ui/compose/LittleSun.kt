package com.minded.minded.ui.compose

import android.view.HapticFeedbackConstants
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.runtime.setValue
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

// Match the web extension's little sun: a solid white disc with a soft, warm
// amber glow around it.
private val SUN_COLOR = Color.White
private val SUN_TEXT_COLOR = Color(0xFF956969)
// Warm amber-gold, leaning a touch more toward yellow than the web little
// sun's #e9843a (a more golden glow reads softer and sunnier).
private val GLOW_COLOR = Color(0xFFE99A3A)

/**
 * How long the sun simply breathes before the gentle step-away invitation
 * fades in. The pause *is* the friction — the sun is the pause (see
 * CLAUDE.md). It also makes an accidental tap harmless: nothing is asked of
 * the user until they have had a quiet moment.
 */
private const val PAUSE_MS = 3800L

/**
 * A gentle offer never nags: if left untouched the invitation fades on its
 * own and the sun returns to its resting bubble. Matches the auto-dismiss of
 * the web grounding / let-go offers.
 */
private const val OFFER_AUTO_DISMISS_MS = 15000L

/** Fade applied when the surface eases out, and when the bubble eases back in. */
private const val FADE_MS = 400

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

/** Little→big expand: travel + grow. Kept snappy so the pause answers the tap. */
private const val EXPAND_MS = 240

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
    var isOverlayVisible by remember { mutableStateOf(isInitiallyVisible) }

    LaunchedEffect(Unit) {
        isOverlayVisible = true
    }

    AnimatedVisibility(
        visible = isOverlayVisible,
        // Fade in when returning from the offer; appear in place on first show
        // (the departing interaction sun has already glided to this corner).
        enter = if (enterFade) fadeIn(animationSpec = tween(FADE_MS)) else EnterTransition.None,
        exit = fadeOut(animationSpec = tween(500)),
    ) {
        Box(
            modifier = Modifier
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
}

@Composable
private fun StepAwayOffer(
    expandFromX: Int,
    expandFromY: Int,
    onStepAway: () -> Unit,
    onStay: () -> Unit,
) {
    // 0 = breathing pause, 1 = invitation shown.
    var phase by remember { mutableStateOf(0) }
    var shown by remember { mutableStateOf(false) }
    var dismissing by remember { mutableStateOf(false) }

    // Soft fade for the whole surface — calmness is the product, never a hard
    // cut. Fades in on appear and out on dismiss.
    val surfaceAlpha by animateFloatAsState(
        targetValue = if (!shown || dismissing) 0f else 1f,
        // Appear quickly on tap; ease out calmly on dismiss.
        animationSpec = tween(durationMillis = if (dismissing) FADE_MS else APPEAR_FADE_MS),
        label = "stepAwaySurfaceAlpha",
    )

    // Hand control back to the resting bubble once the fade-out has played.
    // Driven off the dismissing flag (not the animation's finished-listener) so
    // it can't fire on the fade-IN settling and survives the composable leaving.
    LaunchedEffect(dismissing) {
        if (dismissing) {
            delay(FADE_MS.toLong())
            onStay()
        }
    }

    // The sun breathes — the pause itself, mirroring the web post-sun breath.
    val breath = rememberInfiniteTransition(label = "breath")
    val sunScale by breath.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "breathScale",
    )

    // Drives the little→big expand (travel + grow): 0 = matched to the resting
    // bubble, 1 = full sun at centre. `shown` flips true on the first frame; on
    // a dismiss it stays at 1 and the surface simply fades out.
    val expandProgress by animateFloatAsState(
        targetValue = if (shown) 1f else 0f,
        animationSpec = tween(durationMillis = EXPAND_MS, easing = FastOutSlowInEasing),
        label = "stepAwayExpand",
    )

    // The sun itself is opaque from the first frame — it *is* the little sun
    // (which was opaque), now expanding, so it must not fade in under it. It
    // only fades on dismiss. The dim behind it still eases in via surfaceAlpha.
    val sunAlpha by animateFloatAsState(
        targetValue = if (dismissing) 0f else 1f,
        animationSpec = tween(durationMillis = if (dismissing) FADE_MS else APPEAR_FADE_MS),
        label = "stepAwaySunAlpha",
    )

    val promptAlpha by animateFloatAsState(
        targetValue = if (phase >= 1 && !dismissing) 1f else 0f,
        animationSpec = tween(durationMillis = 600),
        label = "promptAlpha",
    )

    fun beginDismiss() {
        if (!dismissing) dismissing = true
    }

    LaunchedEffect(Unit) {
        shown = true
        delay(PAUSE_MS)
        phase = 1
        delay(OFFER_AUTO_DISMISS_MS)
        beginDismiss()
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.62f * surfaceAlpha))
            // Tapping anywhere off the invitation is the easy way to stay.
            .pointerInput(Unit) {
                detectTapGestures(onTap = { beginDismiss() })
            },
    ) {
        val hasOrigin = expandFromX >= 0 && expandFromY >= 0
        val centrePx = with(LocalDensity.current) {
            Offset(maxWidth.toPx() / 2f, maxHeight.toPx() / 2f)
        }
        // Where the sun starts: the resting bubble's centre (so it expands out of
        // it). Without an origin (e.g. preview) it just grows in place at centre.
        val startCentrePx =
            if (hasOrigin) Offset(expandFromX.toFloat(), expandFromY.toFloat()) else centrePx
        // progress 0 → sit on the old bubble spot; 1 → arrived at centre. offset()
        // is placement-only, so it never disturbs the centred rest position.
        val sunTravel = (startCentrePx - centrePx) * (1f - expandProgress)
        val sunScaleNow = lerp(BIG_SUN_ENTER_SCALE, sunScale, expandProgress)

        SunDisc(
            glowSize = 180.dp,
            discSize = 92.dp,
            scale = sunScaleNow,
            modifier = Modifier
                .align(Alignment.Center)
                .offset { IntOffset(sunTravel.x.roundToInt(), sunTravel.y.roundToInt()) }
                .alpha(sunAlpha),
        )

        // No heading, no question — the breath has already happened. A single
        // gentle offer to step away, with a quiet decline; tapping off it or
        // simply waiting also stays. The choice is never pushed. It rests below
        // the centred sun and only fades in once the breath has passed.
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .align(Alignment.Center)
                .offset(y = 150.dp)
                .alpha(promptAlpha),
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
                onClick = { beginDismiss() },
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

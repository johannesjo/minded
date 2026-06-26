package com.minded.minded.ui.compose

import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
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
import com.minded.minded.util.isDarkModeNow
import kotlin.math.roundToInt
import kotlin.random.Random
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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

// The sky the sun sets into when the pause is pulled down. It reacts to the time
// of day exactly like the web interaction's drag-down background
// (BackgroundTransition.scss + _variables.scss): by day a warm sunset, after dark
// a deep, calm night — never harsh. isDarkModeNow() picks which (the same switch
// that turns the companion into a moon at night), so the revealed sky always
// belongs to the hour rather than being a fixed night.
private val DAY_SKY_COLORS = listOf(
    Color(0xFF4F78BB), // dusk blue up top
    Color(0xFFF49F73), // warm peach
    Color(0xFFFFD36A), // gold near the horizon
    Color(0xFFEF6F63), // coral at the base
)
private val NIGHT_SKY_COLORS = listOf(
    Color(0xFF020C25),
    Color(0xFF041735),
    Color(0xFF07244F),
    Color(0xFF05214E),
)

// The stars that emerge in the night sky share the night sun/moon body's exact
// cool white (SUN_COLOR_NIGHT), so the whole night scene reads as one cool palette
// rather than a warm dot among blue-white pinpricks. Aliased (not a re-typed
// literal) so retuning the moon body carries the stars with it.
private val STAR_COLOR = SUN_COLOR_NIGHT

/** A single star: position as a fraction of the sky (0..1) so it scales with the
 *  surface, a fixed radius, and a base brightness that gives the field depth. */
private class Star(
    val x: Float,
    val y: Float,
    val radiusPx: Float,
    val baseAlpha: Float,
)

/**
 * A fixed, gently varied star field. Seeded so the layout is stable across
 * recompositions (and pleasant rather than clumpy), since the stars only ever
 * fade in/out — their positions never change. The whole field is revealed by an
 * external alpha tied to the drag, so the count/spread here is purely cosmetic.
 */
private fun generateStars(count: Int, minRadiusPx: Float, maxRadiusPx: Float): List<Star> {
    val rng = Random(seed = 8723)
    return List(count) {
        Star(
            x = rng.nextFloat(),
            y = rng.nextFloat(),
            radiusPx = minRadiusPx + rng.nextFloat() * (maxRadiusPx - minRadiusPx),
            // 0.4..1.0: dimmer stars sit further back, brighter ones pop — depth
            // without any twinkle (the calm night sky doesn't flicker or breathe).
            baseAlpha = 0.4f + rng.nextFloat() * 0.6f,
        )
    }
}

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

/** Duration of the pause surface's ease-out and the sun's reverse glide-home. */
private const val FADE_MS = 400

/**
 * On a stay-dismiss (Not now / tap-off / ignored) the sun first glides home over
 * FADE_MS staying fully opaque, then hands off to the resting bubble over this.
 * The hand-off only needs to outlast the window resize (full-screen → little
 * bubble), which must happen behind an *invisible* sun or it shows as a 1-frame
 * jump — so this is kept short: just long enough to mask the resize, not a slow
 * fade that reads as the sun "disappearing" before a separate bubble animates in.
 * The opaque bubble then takes the sun's exact spot with no entrance of its own,
 * so the whole close reads as one continuous motion.
 *
 * NOTE: a single window can't be perfectly seamless here (the resize and Compose
 * re-layout can't land in the same frame); the only fully gap-free fix is two
 * windows. This is the tightened one-window interim — tune on a device.
 */
private const val CROSSFADE_MS = 80

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
 * How far the pulled-down sun follows the finger. Just under 1:1 — the sun stays
 * connected to the finger (so the drag feels responsive, like the full
 * interaction's drag-down) while a touch of weight still keeps it from being
 * whipped across the screen by a fast flick. The earlier heavy 0.5 made the sun
 * lag the finger so far the gesture read as slow and stuck; the calm comes from
 * the committed *set* easing out (SET_MS), not from crippling the live drag.
 */
private const val DRAG_FOLLOW_FACTOR = 0.8f

/**
 * Once the pull commits, the sun sets below the horizon over this — a calm,
 * deliberate sink (the full interaction's drag-down completion eases over a
 * similar unhurried beat), not the old quick drop.
 */
private const val SET_MS = 620

/**
 * After the sun has set, the sky and dim recede over this to reveal minded
 * (already launched behind the raised dim). A soft ease-away into the app rather
 * than the old hard ~300ms cut that snapped the screen out the instant the sun
 * was gone.
 */
private const val SKY_RECEDE_MS = 480

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
    // True when the bubble reappears after the offer collapses: it then waits for
    // the window resize to settle before showing (so it can't appear mid-resize
    // and shift), and snaps in opaque at the sun's spot — the continuation of the
    // glide, with no entrance of its own. On the very first show there's no resize
    // (the departing interaction sun has just glided to this corner): it appears
    // in place. (Despite the historical name, this no longer drives any fade.)
    enterFade: Boolean = false,
    // Screen-px centre of the resting bubble at the moment of tap, so the pause
    // sun can expand *out of* it. -1 = unknown (e.g. preview): centre-bloom only.
    expandFromX: Int = -1,
    expandFromY: Int = -1,
    onTap: () -> Unit = {},
    onDrag: (dxPx: Float, dyPx: Float) -> Unit = { _, _ -> },
    onDragEnd: () -> Unit = {},
    // Fired the instant a pull-down commits, before the sun finishes setting: it
    // launches minded behind the still-raised dim so the app is drawn and ready by
    // the time the sky recedes to reveal it (no blocked-app flash, no hard cut).
    onLeaving: () -> Unit = {},
    // Pulling the sun down is the one offered gesture: it steps away into minded —
    // the calm redirect the old "Step away" button performed. The gentle stay
    // paths (tap-off / wait) glide the sun back home instead.
    onStepAway: () -> Unit = {},
    onStay: () -> Unit = {},
) {
    if (expanded) {
        StepAwayOffer(
            expandFromX = expandFromX,
            expandFromY = expandFromY,
            onLeaving = onLeaving,
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
    // The resting bubble never animates its own entrance — it is the sun that just
    // glided home, so it simply *is* there, at the exact spot/size the glide ended
    // (the pause sun's matched first/last frame). A self-fade read as a second,
    // separate animation after the glide ("the little sun is animated in"), which
    // broke the one-motion feel. On a return-after-collapse the reveal is still
    // gated on the resize settling (LaunchedEffect below) so it can't pop
    // mid-resize and shift — but once shown, it snaps in.
    val bubbleAlpha by animateFloatAsState(
        targetValue = if (revealed) 1f else 0f,
        animationSpec = tween(durationMillis = 0),
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
    onLeaving: () -> Unit,
    onStepAway: () -> Unit,
    onStay: () -> Unit,
) {
    // For the soft haptic that confirms the pull-down step-away commit.
    val view = LocalView.current
    // 0 = quiet hold, 1 = the gentle hint has been invited in.
    var phase by remember { mutableStateOf(0) }
    var shown by remember { mutableStateOf(false) }
    var dismissing by remember { mutableStateOf(false) }
    // A "stay" dismiss (tap-off / ignored) plays the expand in reverse: the sun
    // shrinks and glides back to its bubble corner, then hands off to the resting
    // bubble. A drag-down step-away instead sinks the sun off-screen.
    var reverseDismiss by remember { mutableStateOf(false) }
    // Set once the reverse glide-home has landed: the sun is quickly hidden at its
    // corner so the window can resize behind it unseen, then the resting bubble
    // takes its exact place (snapped, no entrance of its own).
    var crossfading by remember { mutableStateOf(false) }
    // True once a pull-down has committed and its sink animation is in flight. It
    // locks out every stay path (auto-dismiss timer, tap-off) so collapse() can't
    // race onStepAway() on the same window during the set-and-leave.
    var committing by remember { mutableStateOf(false) }
    // Set once the sun has finished setting: the sky + dim then recede to reveal
    // minded (already launched behind the dim). Drives surfaceAlpha to 0 over
    // SKY_RECEDE_MS — the soft ease-away into the app, replacing the old hard cut.
    var setting by remember { mutableStateOf(false) }
    // True from the moment the sun is grabbed to drag until the pull is released
    // without committing. Drives the hint's instant fade so the words step aside as
    // soon as the motion begins, rather than lingering until the sun has travelled.
    var grabbed by remember { mutableStateOf(false) }

    // Soft fade for the whole surface — calmness is the product, never a hard
    // cut. Fades in on appear and out on dismiss.
    val surfaceAlpha by animateFloatAsState(
        targetValue = if (!shown || dismissing || setting) 0f else 1f,
        // Appear quickly on tap; ease out calmly on a stay-dismiss; and recede
        // gently into the app once the committed sun has set (the sky-recede).
        animationSpec = tween(
            durationMillis = when {
                setting -> SKY_RECEDE_MS
                dismissing -> FADE_MS
                else -> APPEAR_FADE_MS
            },
        ),
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

    // The gentle hint that names the one gesture. It fades in once the pause has
    // settled, fades out quickly on dismiss so it never lingers over the returning
    // sun, and — the instant the sun is grabbed to drag (`grabbed`) — clears in a
    // quick 200ms beat so the words step aside as soon as the motion begins and the
    // rising sky takes over. It eases back in (450ms) if the pull is released early.
    val hintAlpha by animateFloatAsState(
        targetValue = if (phase >= 1 && !dismissing && !grabbed) 1f else 0f,
        animationSpec = tween(durationMillis = if (dismissing || grabbed) 200 else 450),
        label = "hintAlpha",
    )

    // Drag-down-to-step-away: pull the sun downward — the same drag-down gesture
    // the dashboard sun uses. The sun follows the finger and the sky rises behind
    // it; released past the threshold it sets into minded, otherwise it springs
    // back.
    val dragY = remember { Animatable(0f) }
    val dragScope = rememberCoroutineScope()
    val dismissDragPx = with(LocalDensity.current) { 120.dp.toPx() }
    val screenHeightPx = with(LocalDensity.current) {
        LocalConfiguration.current.screenHeightDp.dp.toPx()
    }
    // Where the committed sun sets to: just clear of the bottom edge, so its
    // ease-out lands as it dips below the horizon (the calm part reads on-screen)
    // rather than being spent travelling far below it. 160dp past centre carries
    // the disc + its 180dp glow fully off.
    val setTargetPx = screenHeightPx / 2f + with(LocalDensity.current) { 160.dp.toPx() }
    // 0 = at rest, 1 = pulled to the dismiss threshold. Drives how far the sky has
    // risen behind the sun — the sun itself stays fully opaque and sets into the
    // sky rather than fading away.
    val dragProgress = (dragY.value / dismissDragPx).coerceIn(0f, 1f)
    // Warm sunset by day, deep night after dark — the same time-of-day switch the
    // companion sun/moon uses, so the sky the sun sets into matches the hour.
    val isNightSky = isDarkModeNow()
    val skyBrush = remember(isNightSky) {
        Brush.verticalGradient(if (isNightSky) NIGHT_SKY_COLORS else DAY_SKY_COLORS)
    }
    // Only the night sky has stars. Generated once (positions never change — they
    // only fade in/out), so an empty list by day costs nothing.
    val density = LocalDensity.current
    val stars = remember(isNightSky) {
        if (isNightSky) {
            with(density) { generateStars(count = 120, 1.dp.toPx(), 2.4.dp.toPx()) }
        } else {
            emptyList()
        }
    }

    fun beginDismiss(reverse: Boolean = false) {
        // Never start a stay-dismiss once a step-away pull has committed: its sink
        // animation is mid-flight and will call onStepAway(), so letting the
        // auto-dismiss timer or a stray tap also fire would race collapse() (stay)
        // against the leave on the same window.
        if (!dismissing && !committing) {
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
            // Pull down to step away: the content tracks the finger; released past
            // the threshold it sets into minded, otherwise it springs back.
            .pointerInput(Unit) {
                detectVerticalDragGestures(
                    // The sun is grabbed: clear the hint at once (see hintAlpha).
                    onDragStart = { grabbed = true },
                    onDragCancel = {
                        grabbed = false
                        dragScope.launch {
                            dragY.animateTo(0f, tween(durationMillis = 240, easing = FastOutSlowInEasing))
                        }
                    },
                    onVerticalDrag = { _, dy ->
                        // Track the finger closely (just under 1:1) so the drag feels
                        // responsive, with a touch of weight so a fast swipe can't
                        // whip the sun down — see DRAG_FOLLOW_FACTOR.
                        dragScope.launch {
                            dragY.snapTo((dragY.value + dy * DRAG_FOLLOW_FACTOR).coerceAtLeast(0f))
                        }
                    },
                    onDragEnd = {
                        // The pull only commits once the pause has settled
                        // (phase >= 1) — so a hurried tap-then-flick during the
                        // opening beat springs back instead of ejecting before the
                        // hint has even appeared. This is the same PAUSE_MS friction
                        // the buttons had via their `enabled = phase >= 1`.
                        if (phase >= 1 && dragY.value >= dismissDragPx) {
                            // Pulled past the threshold: the sun sets. Launch minded
                            // *now* (onLeaving), behind the still-raised dim, so it is
                            // drawn and ready by the time the sky recedes to reveal it
                            // — no blocked-app flash, no hard cut. The sun then sinks
                            // calmly below the horizon (SET_MS, staying fully opaque
                            // while the sky holds), and only once it has set does the
                            // sky + dim ease away into minded (setting → SKY_RECEDE_MS).
                            // This choreographs the leave like the full interaction's
                            // drag-down completion rather than a quick drop-then-cut. A
                            // soft tick confirms the deliberate, chosen leave.
                            committing = true
                            view.performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
                            onLeaving()
                            dragScope.launch {
                                dragY.animateTo(
                                    setTargetPx,
                                    tween(durationMillis = SET_MS, easing = FastOutSlowInEasing),
                                )
                                // The sun has set; let the sky and dim recede to
                                // reveal minded, then tear down the spent window.
                                setting = true
                                delay(SKY_RECEDE_MS.toLong())
                                onStepAway()
                            }
                        } else {
                            // Released before the threshold: the hint eases back in
                            // as the sun springs home.
                            grabbed = false
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
        // The sky rises behind the sun as it is pulled down — a warm sunset by day,
        // a deep night after dark, the same time-of-day palette the in-app sun-set
        // uses. Fully out at the dismiss threshold; recedes if the pull is released
        // early. Sits above the dim and below the sun, and fades with the surface on
        // dismiss.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .alpha(surfaceAlpha * dragProgress)
                .background(skyBrush),
        )

        // Stars come out as the night sky rises behind the setting sun — only after
        // dark, and only as far as the pull has gone. They emerge a beat later than
        // the sky (dragProgress², so the deeper the pull the more the night fills in)
        // and recede the same way if the sun is dragged back up or springs home, since
        // their alpha is driven straight off the live drag. The global alpha is folded
        // into each star so no extra compositing layer is needed. Above the sky
        // gradient, behind the sun.
        if (stars.isNotEmpty()) {
            val starsAlpha = surfaceAlpha * dragProgress * dragProgress
            Canvas(modifier = Modifier.fillMaxSize()) {
                if (starsAlpha <= 0f) return@Canvas
                for (star in stars) {
                    drawCircle(
                        color = STAR_COLOR,
                        radius = star.radiusPx,
                        center = Offset(star.x * size.width, star.y * size.height),
                        alpha = (star.baseAlpha * starsAlpha).coerceIn(0f, 1f),
                    )
                }
            }
        }

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

        // No heading, no question, no buttons — the quiet moment has already
        // passed. A single soft line names the one gesture, like the dashboard
        // interaction's drag hint: pull the sun down to step away into minded. It
        // rests below the centred sun, fades in only once the pause has settled,
        // and fades out the instant the sun is grabbed (the motion and the rising
        // sky take over from the words). Tapping off, or simply waiting, still
        // glides the sun home — the gesture is never pushed.
        Text(
            text = "Drag the sun down to step away",
            color = Color.White,
            fontSize = 16.sp,
            textAlign = TextAlign.Center,
            // A soft drop shadow keeps the white line readable over whatever bright
            // app content shows through the dim, without adding any chrome.
            style = TextStyle(
                shadow = Shadow(
                    color = Color.Black.copy(alpha = 0.6f),
                    offset = Offset(0f, 1f),
                    blurRadius = 12f,
                ),
            ),
            modifier = Modifier
                .align(Alignment.Center)
                .offset { IntOffset(0, (150.dp.toPx() + dragY.value).roundToInt()) }
                .alpha(hintAlpha),
        )
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
        LittleSun(elapsedSeconds = 1000, isInitiallyVisible = true)
    }
}

@Preview
@Composable
fun LittleSunExpandedPreview() {
    LittleSun(elapsedSeconds = 1000, expanded = true)
}

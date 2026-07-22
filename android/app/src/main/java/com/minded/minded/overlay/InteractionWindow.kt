package com.minded.minded.overlay

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDp
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.updateTransition
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.SunDisc
import com.minded.minded.util.ForwardSafeAreaInsetsToWebView
import com.minded.minded.util.SafeAreaInsetsHolder
import kotlinx.coroutines.delay
import org.json.JSONObject
import org.json.JSONTokener
import java.util.Calendar
import kotlin.math.abs

internal data class ArrivalSunTarget(
    val centerXFraction: Float,
    val centerYFraction: Float,
    val widthFraction: Float,
)

private const val ARRIVAL_SUN_TARGET_STABILITY_TOLERANCE = 0.005f
private const val ARRIVAL_SUN_TARGET_REQUIRED_MEASUREMENTS = 2

internal data class ArrivalSunTargetStability(
    val target: ArrivalSunTarget? = null,
    val consecutiveMeasurements: Int = 0,
) {
    val isStable: Boolean
        get() = target != null &&
            consecutiveMeasurements >= ARRIVAL_SUN_TARGET_REQUIRED_MEASUREMENTS
}

/**
 * Advance the target only when DOM measurements settle near one another. A
 * rotation, relayout, or invalid sample starts a fresh sequence instead of
 * committing a coordinate captured mid-motion.
 */
internal fun advanceArrivalSunTargetStability(
    previous: ArrivalSunTargetStability,
    measurement: ArrivalSunTarget?,
): ArrivalSunTargetStability {
    if (measurement == null) return ArrivalSunTargetStability()

    val previousTarget = previous.target
    val isNearPrevious = previousTarget != null &&
        abs(previousTarget.centerXFraction - measurement.centerXFraction) <=
        ARRIVAL_SUN_TARGET_STABILITY_TOLERANCE &&
        abs(previousTarget.centerYFraction - measurement.centerYFraction) <=
        ARRIVAL_SUN_TARGET_STABILITY_TOLERANCE &&
        abs(previousTarget.widthFraction - measurement.widthFraction) <=
        ARRIVAL_SUN_TARGET_STABILITY_TOLERANCE

    return ArrivalSunTargetStability(
        target = measurement,
        consecutiveMeasurements = if (isNearPrevious) {
            previous.consecutiveMeasurements + 1
        } else {
            1
        },
    )
}

/** Parse either shape Android's evaluateJavascript callback can return. */
internal fun parseArrivalSunTarget(rawValue: String): ArrivalSunTarget? {
    val value = runCatching { JSONTokener(rawValue).nextValue() }.getOrNull()
    val targetJson = when (value) {
        is JSONObject -> value
        is String -> runCatching { JSONObject(value) }.getOrNull()
        else -> null
    } ?: return null

    val centerX = targetJson.optDouble("centerXFraction", Double.NaN)
    val centerY = targetJson.optDouble("centerYFraction", Double.NaN)
    val width = targetJson.optDouble("widthFraction", Double.NaN)
    if (!centerX.isFinite() || !centerY.isFinite() || !width.isFinite()) return null
    if (centerX !in 0.0..1.0 || centerY !in 0.0..1.0 || width !in 0.0..1.0) return null
    if (width == 0.0) return null

    return ArrivalSunTarget(
        centerXFraction = centerX.toFloat(),
        centerYFraction = centerY.toFloat(),
        widthFraction = width.toFloat(),
    )
}

internal fun shouldDismissFreshArrivalAfterTimeout(target: ArrivalSunTarget?): Boolean =
    target == null

internal enum class FreshArrivalEscapeStep {
    NONE,
    MORPH_TO_LITTLE_SUN,
    SHOW_LITTLE_SUN,
}

internal fun resolveFreshArrivalEscapeStep(
    escapeRequested: Boolean,
    hasReachedLittleSunTarget: Boolean,
): FreshArrivalEscapeStep = when {
    !escapeRequested -> FreshArrivalEscapeStep.NONE
    hasReachedLittleSunTarget -> FreshArrivalEscapeStep.SHOW_LITTLE_SUN
    else -> FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN
}

internal fun shouldPostSkipInteractionToMainThread(isMainThread: Boolean): Boolean =
    !isMainThread

internal fun shouldCompleteFreshEscapeHandoff(
    step: FreshArrivalEscapeStep,
    placeholderVisible: Boolean,
    animationRunning: Boolean,
    windowAvailable: Boolean,
): Boolean =
    step == FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN &&
        placeholderVisible &&
        !animationRunning &&
        windowAvailable

internal fun shouldEnableFreshArrivalSunEscape(
    isCornerArrival: Boolean,
    isFreshPlaceholderVisible: Boolean,
    escapeStep: FreshArrivalEscapeStep = FreshArrivalEscapeStep.NONE,
): Boolean =
    !isCornerArrival &&
        isFreshPlaceholderVisible &&
        escapeStep == FreshArrivalEscapeStep.NONE

class InteractionWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
//    private val dashboardViewModel: DashboardViewModel,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    companion object {
        // How long to keep nudging the freshly-loaded overlay WebView to paint
        // its first frame. Long enough to bridge the gap until the web content's
        // own fade-in animation starts driving frames, short enough to add no
        // meaningful battery/CPU cost.
        private const val FIRST_FRAME_PUMP_MS = 800L

        // Duration of the near-opaque window alpha nudge that forces the overlay
        // window to recomposite its first frame after load.
        private const val FIRST_FRAME_ALPHA_NUDGE_MS = 200L

        // Safety net for the reverse-morph corner placeholder: if the web never
        // signals its sun has arrived (a load error, reduced-motion, the morph
        // skipped), fade the native disc out anyway so it can't strand on screen.
        // Comfortably longer than a normal WebView first paint.
        private const val CORNER_PLACEHOLDER_FALLBACK_MS = 1500L

        // A fresh intervention starts with the native sun centred in the native
        // sky. Once the WebView has painted, glide that disc to the exact DOM sun
        // bounds, then cross-fade the two surfaces at the shared position.
        //
        // On a fresh open there is no Little Sun to continue from, so this glide +
        // cross-fade must NOT read as a morph (it's a load-gap cover, not a hand-off
        // from a prior disc). The old timings made the disc "move quickly up a bit
        // and then the glow vanish abruptly": a 320ms glide is brisk, and a 220ms
        // cross-fade snaps the native disc's strong halo out faster than the calmer
        // web moon fades in. Slow and gentle both so the placeholder eases to the
        // web sun and dissolves into it rather than snapping away.
        private const val FRESH_SUN_MORPH_MS = 540
        private const val FRESH_SUN_CROSSFADE_MS = 460L
        private const val FRESH_ARRIVAL_READY_TIMEOUT_MS = 2500L
        private const val FRESH_TARGET_RETRY_MS = 80L
        private const val FRESH_TARGET_MAX_ATTEMPTS = 8

        private val MEASURE_WEB_SUN_JAVASCRIPT = """
            (function() {
              const sun = document.querySelector('.minded-sun');
              if (!sun || !window.innerWidth || !window.innerHeight) return null;
              const rect = sun.getBoundingClientRect();
              if (!rect.width) return null;
              return {
                centerXFraction: (rect.left + rect.width / 2) / window.innerWidth,
                centerYFraction: (rect.top + rect.height / 2) / window.innerHeight,
                widthFraction: rect.width / window.innerWidth
              };
            })();
        """.trimIndent()
    }

    override val logTag = javaClass.simpleName

    // Appear as an instantly-opaque shield: the interaction overlay covers the
    // blocked app the user just opened, so it must never be semi-transparent
    // while fading in (which would let a tempting post show through). The smooth
    // appearance happens in the native sky + sun and then the web content
    // (#minded-6622 / .interaction-content) that fades over that opaque shield.
    override val fadeInDurationMs: Long = 0L

    private var webViewRef: WebView? = null
    private val safeAreaInsetsHolder = SafeAreaInsetsHolder()

    // Set by the controller just before showWindow() when this interaction is
    // being re-shown because a Little Sun session timer ran out. Passed to the web
    // layer as a URL flag so the sun *arrives* by gliding out of the Little Sun's
    // corner (the mirror of the departing hand-off) instead of snapping in centred.
    // The controller sets it explicitly for every interaction show (false for a
    // plain fresh intervention), so it never goes stale between shows.
    var morphInFromCorner: Boolean = false

    // Snapshot the requested mode only after this window has accepted a show.
    // The controller can update morphInFromCorner before a duplicate show call;
    // that rejected request must not change callbacks belonging to the live view.
    private var activeMorphInFromCorner: Boolean = false

    // Reverse-morph hand-off: while a freshly-shown morph interaction loads its
    // WebView over the opaque native sky, a native sun disc
    // holds the Little Sun's resting corner so that spot is never empty before the
    // web sun appears there. Set true for a morph show (in showWindow), cross-faded
    // out when the web signals its sun has painted (onArrivingSunReady) or by the
    // fallback above - so it can never strand on screen.
    private val showCornerPlaceholder = mutableStateOf(false)

    // Fresh-intervention hand-off. Unlike the corner case there is no prior
    // Little Sun to continue from, so a full-size native disc appears centred
    // immediately, then moves to the measured WebView sun before cross-fading.
    private val showFreshPlaceholder = mutableStateOf(false)
    private val freshSunTarget = mutableStateOf<ArrivalSunTarget?>(null)
    private val freshEscapeStep = mutableStateOf(FreshArrivalEscapeStep.NONE)
    private var freshTargetMeasurementAttempts = 0
    private var freshTargetStability = ArrivalSunTargetStability()
    private var activeLoadingSkyBlend = LoadingSkyBlend.dark()

    @SuppressLint("StateFlowValueCalledInComposition")
    @Composable
    override fun Cmp() {
        val win = this;
        val isCornerArrival = activeMorphInFromCorner
        val questionId = sharedOverlayViewModel.sharedData.value.lastQuestionForPrompt?.id;
        Log.v(logTag, "questionId: $questionId")

        val webViewState = remember { mutableStateOf<WebView?>(null) }
        ForwardSafeAreaInsetsToWebView(webViewState.value, safeAreaInsetsHolder)

        Box(modifier = Modifier.fillMaxSize()) {
            LoadingSkyBackdrop(activeLoadingSkyBlend)
        AndroidView(
            modifier = Modifier.fillMaxSize().imePadding(),
            factory = { context ->
            WebView(context).also {
                webViewRef = it
                webViewState.value = it
            }.apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                settings.javaScriptEnabled = true
                settings.allowFileAccess = true
                settings.allowFileAccessFromFileURLs = true
                settings.allowUniversalAccessFromFileURLs = true
                settings.allowContentAccess = true
                settings.setNeedInitialFocus(true)
                settings.mediaPlaybackRequiresUserGesture = false
                // Disable caching to always load fresh content
                settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                this.focusable = focusable
                
                // Stay transparent over the native loading sky. That sky is the
                // instantly-opaque shield, so loading never exposes either the
                // blocked app or the WebView's default white surface.
                this.setBackgroundColor(android.graphics.Color.TRANSPARENT)
                // A fresh arrival remains behind the native disc until its first
                // painted sun has been measured and the native morph reaches it.
                // Corner arrivals already have their own continuous web morph.
                alpha = if (isCornerArrival) 1f else 0f
                isEnabled = isCornerArrival

                // Deliberately do NOT force LAYER_TYPE_HARDWARE here: a WebView is
                // already hardware-accelerated at the window level, and forcing it
                // onto its own hardware layer inside a TYPE_APPLICATION_OVERLAY +
                // translucent window makes a freshly-created overlay WebView often
                // never composite its first frame - leaving the user on the native
                // backstop (historically the "black screen on first open, clears on
                // reopen" reports). Let the WebView use the default layer so the first frame
                // paints. We also pump invalidate()s after load (see pumpFirstFrame /
                // onPageFinished) to force that first composite without a tap; only
                // reach for a hardware layer if first-paint flakiness still remains.

                // Set transparent background after page starts loading
                this.webViewClient = object : android.webkit.WebViewClient() {
                    override fun onPageStarted(view: android.webkit.WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        super.onPageStarted(view, url, favicon)
                        view?.setBackgroundColor(android.graphics.Color.TRANSPARENT)
                    }

                    // Guarantee the first frame composites without needing a tap.
                    // This overlay is a TYPE_APPLICATION_OVERLAY + TRANSLUCENT window
                    // with fadeInDurationMs = 0L, so - unlike the other overlays - no
                    // native alpha animation runs after addView to drive a frame. With
                    // nothing invalidating, a hardware-accelerated overlay WebView can
                    // fail to schedule its first composite and the user is left on the
                    // opaque dark shield; the next touch schedules a frame, which is the
                    // "black screen until I tap it" report. Force that first frame two
                    // ways: a near-opaque window alpha animation (recomposites the whole
                    // overlay window - the lever the other overlays' fade-in proves out)
                    // plus a short burst of view invalidates.
                    override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        nudgeWindowAlpha()
                        view?.let { webView ->
                            pumpFirstFrame(webView)
                            if (!isCornerArrival) {
                                webView.postVisualStateCallback(
                                    SystemClock.uptimeMillis(),
                                    object : WebView.VisualStateCallback() {
                                        override fun onComplete(requestId: Long) {
                                            webView.post { measureFreshWebSun(webView) }
                                        }
                                    },
                                )
                            }
                        }
                    }

                    // Diagnostics for first-paint failures: if the web layer never
                    // paints, the native sky remains visible. A main-frame load error
                    // means the interaction app never booted at all - log it so a
                    // logcat from a repro identifies that failure mode.
                    override fun onReceivedError(
                        view: android.webkit.WebView?,
                        request: android.webkit.WebResourceRequest?,
                        error: android.webkit.WebResourceError?,
                    ) {
                        super.onReceivedError(view, request, error)
                        if (request?.isForMainFrame == true) {
                            Log.e(
                                logTag,
                                "onReceivedError main-frame: code=${error?.errorCode} desc=${error?.description} url=${request.url}",
                            )
                            hideFailedWebViewOnMainThread(view)
                        }
                    }

                    // A gone render process leaves a blank WebView that only recovers on
                    // a fresh instance - which matches the "clears on reopen" symptom.
                    // Without this override the whole host app process is killed when it
                    // happens; survive it, log whether it crashed vs was reclaimed, and
                    // tear the window down so the user isn't left on a dead overlay
                    // (reopening the app yields a fresh interaction).
                    // shortcut: log-and-teardown - auto re-show the intervention here
                    // once a repro confirms this is the cause.
                    override fun onRenderProcessGone(
                        view: android.webkit.WebView?,
                        detail: android.webkit.RenderProcessGoneDetail?,
                    ): Boolean {
                        Log.e(
                            logTag,
                            "onRenderProcessGone didCrash=${detail?.didCrash()} priorityAtExit=${detail?.rendererPriorityAtExit()}",
                        )
                        hideFailedWebViewOnMainThread(view)
                        return true
                    }
                }
                
                val jsInterface = InteractionWindowJavaScriptInterface(
                    this,
                    sharedOverlayViewModel,
                    win,
                    ctrlSvc,
                    safeAreaInsets = safeAreaInsetsHolder,
                )
                addJavascriptInterface(jsInterface, "androidMinded")
                // Query goes before the hash so the existing `#questionId` parsing
                // on the web side is untouched; the flag drives the reverse morph.
                val morphQuery = if (isCornerArrival) "?morphInFromCorner=1" else ""
                loadUrl("file:///android_asset/web/src/android/interaction/index.html$morphQuery#${questionId}")
            }
        })

        if (!isCornerArrival) {
            FreshArrivalSun()
        }

        // Reverse-morph hand-off: hold a sun disc at the Little Sun's resting
        // corner over the loading WebView and native sky
        // so the corner is never empty before the web sun arrives there. It
        // cross-fades out the moment the web signals (onArrivingSunReady), or by
        // the fallback so it can't strand.
        if (isCornerArrival) {
            val placeholderAlpha by animateFloatAsState(
                targetValue = if (showCornerPlaceholder.value) 1f else 0f,
                label = "cornerPlaceholderAlpha",
            )
            LaunchedEffect(Unit) {
                delay(CORNER_PLACEHOLDER_FALLBACK_MS)
                showCornerPlaceholder.value = false
            }
            if (placeholderAlpha > 0f) {
                // The same resting spot the bubble parks at; the arriving web sun
                // targets this exact point too (getLittleSunRestCenter), so the
                // disc, the bubble that just left, and the web sun all line up.
                val rest = remember {
                    LittleSunPosition.restingTopLeft(
                        ctrlSvc,
                        windowManager,
                        ctrlSvc.getSharedPreferenceService().getLittleSunPosition(),
                    )
                }
                Box(
                    modifier = Modifier
                        .offset { IntOffset(rest.first, rest.second) }
                        .alpha(placeholderAlpha),
                ) {
                    SunDisc()
                }
            }
        }
        }
    }

    @Composable
    private fun LoadingSkyBackdrop(blend: LoadingSkyBlend) {
        Image(
            painter = painterResource(blend.from.drawableResource()),
            contentDescription = null,
            contentScale = ContentScale.FillBounds,
            modifier = Modifier.fillMaxSize(),
        )
        if (blend.from != blend.to && blend.progress > 0f) {
            Image(
                painter = painterResource(blend.to.drawableResource()),
                contentDescription = null,
                contentScale = ContentScale.FillBounds,
                alpha = blend.progress,
                modifier = Modifier.fillMaxSize(),
            )
        }
    }

    @Composable
    private fun FreshArrivalSun() {
        BoxWithConstraints(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.TopStart,
        ) {
            val target = freshSunTarget.value
            val sunTransition = updateTransition(
                targetState = target,
                label = "freshArrivalSunTransition",
            )
            val centerX by sunTransition.animateDp(
                transitionSpec = {
                    tween(FRESH_SUN_MORPH_MS, easing = FastOutSlowInEasing)
                },
                label = "freshArrivalSunX",
            ) { state ->
                state?.let { maxWidth * it.centerXFraction } ?: maxWidth / 2
            }
            val centerY by sunTransition.animateDp(
                transitionSpec = {
                    tween(FRESH_SUN_MORPH_MS, easing = FastOutSlowInEasing)
                },
                label = "freshArrivalSunY",
            ) { state ->
                state?.let { maxHeight * it.centerYFraction } ?: maxHeight / 2
            }
            val discSize by sunTransition.animateDp(
                transitionSpec = {
                    tween(FRESH_SUN_MORPH_MS, easing = FastOutSlowInEasing)
                },
                label = "freshArrivalSunSize",
            ) { state ->
                state?.let { maxWidth * it.widthFraction } ?: 80.dp
            }
            val placeholderAlpha by animateFloatAsState(
                targetValue = if (showFreshPlaceholder.value) 1f else 0f,
                animationSpec = tween(FRESH_SUN_CROSSFADE_MS.toInt()),
                label = "freshArrivalSunAlpha",
            )

            val escapeStep = freshEscapeStep.value
            val animationRunning = sunTransition.isRunning
            val hasReachedTarget =
                target != null && sunTransition.currentState == sunTransition.targetState
            LaunchedEffect(escapeStep, animationRunning, hasReachedTarget) {
                when {
                    !hasReachedTarget || animationRunning -> Unit
                    escapeStep == FreshArrivalEscapeStep.MORPH_TO_LITTLE_SUN ->
                        finishFreshEscapeHandoff(animationRunning)
                    escapeStep == FreshArrivalEscapeStep.NONE ->
                        finishFreshArrivalHandoff()
                }
            }
            LaunchedEffect(Unit) {
                delay(FRESH_ARRIVAL_READY_TIMEOUT_MS)
                if (shouldDismissFreshArrivalAfterTimeout(freshSunTarget.value)) {
                    // A loaded document is not proof that Solid mounted. Never
                    // reveal the disabled, control-free loading sky as though it
                    // were a ready interaction; dismiss so the user cannot be
                    // trapped behind a full-screen overlay.
                    Log.e(
                        logTag,
                        "Fresh interaction sun never became ready; dismissing overlay",
                    )
                    hideFailedWebViewOnMainThread(webViewRef)
                }
            }

            if (placeholderAlpha > 0f) {
                // A snugger halo than the Little Sun's (discSize * 2f) so the fresh
                // placeholder doesn't "glow strongly" and, crucially, so its halo is
                // close to the calmer web moon it cross-fades into - the smaller the
                // glow delta across the hand-off, the less the glow reads as
                // vanishing when the native disc dissolves out.
                val glowSize = discSize * 1.5f
                val isEscapeEnabled = shouldEnableFreshArrivalSunEscape(
                    isCornerArrival = activeMorphInFromCorner,
                    isFreshPlaceholderVisible = showFreshPlaceholder.value,
                    escapeStep = freshEscapeStep.value,
                )
                val escapeModifier = if (isEscapeEnabled) {
                    Modifier
                        .clickable(
                            role = Role.Button,
                            onClickLabel = "Continue to the app",
                            onClick = ::escapeFreshArrival,
                        )
                        .semantics {
                            contentDescription = "Sun"
                        }
                } else {
                    Modifier.clearAndSetSemantics { }
                }
                Box(
                    modifier = Modifier
                        .offset(x = centerX - glowSize / 2, y = centerY - glowSize / 2)
                        .alpha(placeholderAlpha)
                        .then(escapeModifier),
                ) {
                    SunDisc(glowSize = glowSize, discSize = discSize)
                }
            }
        }
    }

    private fun measureFreshWebSun(view: WebView) {
        if (
            webViewRef !== view ||
            activeMorphInFromCorner ||
            !showFreshPlaceholder.value ||
            freshEscapeStep.value != FreshArrivalEscapeStep.NONE
        ) return
        freshTargetMeasurementAttempts += 1
        view.evaluateJavascript(MEASURE_WEB_SUN_JAVASCRIPT) { rawValue ->
            if (
                webViewRef !== view ||
                activeMorphInFromCorner ||
                !showFreshPlaceholder.value ||
                freshEscapeStep.value != FreshArrivalEscapeStep.NONE
            ) return@evaluateJavascript

            freshTargetStability = advanceArrivalSunTargetStability(
                freshTargetStability,
                parseArrivalSunTarget(rawValue),
            )
            val stableTarget = freshTargetStability.target
                ?.takeIf { freshTargetStability.isStable }
            if (stableTarget != null) {
                freshSunTarget.value = stableTarget
            } else if (freshTargetMeasurementAttempts < FRESH_TARGET_MAX_ATTEMPTS) {
                view.postDelayed({ measureFreshWebSun(view) }, FRESH_TARGET_RETRY_MS)
            }
        }
    }

    private fun finishFreshArrivalHandoff() {
        if (
            activeMorphInFromCorner ||
            !showFreshPlaceholder.value ||
            freshEscapeStep.value != FreshArrivalEscapeStep.NONE
        ) return
        val webView = webViewRef ?: return
        withWindowUnlessHiding {
            if (
                activeMorphInFromCorner ||
                !showFreshPlaceholder.value ||
                freshEscapeStep.value != FreshArrivalEscapeStep.NONE
            ) return@withWindowUnlessHiding
            showFreshPlaceholder.value = false
            webView.isEnabled = true
            webView.animate()
                .alpha(1f)
                .setDuration(FRESH_SUN_CROSSFADE_MS)
                .start()
        }
    }

    private fun escapeFreshArrival() {
        if (
            !shouldEnableFreshArrivalSunEscape(
                isCornerArrival = activeMorphInFromCorner,
                isFreshPlaceholderVisible = showFreshPlaceholder.value,
                escapeStep = freshEscapeStep.value,
            )
        ) return

        freshEscapeStep.value = resolveFreshArrivalEscapeStep(
            escapeRequested = true,
            hasReachedLittleSunTarget = false,
        )
        freshSunTarget.value = littleSunArrivalTarget()
    }

    private fun littleSunArrivalTarget(): ArrivalSunTarget {
        val savedPosition = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
        val (centerXFraction, centerYFraction) = LittleSunPosition.restingCenterFractions(
            ctrlSvc,
            windowManager,
            savedPosition,
        )
        val density = ctrlSvc.resources.displayMetrics.density
        val discWidthPx = LittleSunPosition.bubbleSizePx(density) / 2f
        return ArrivalSunTarget(
            centerXFraction = centerXFraction,
            centerYFraction = centerYFraction,
            widthFraction = discWidthPx /
                LittleSunPosition.displayWidthPx(ctrlSvc, windowManager),
        )
    }

    private fun finishFreshEscapeHandoff(animationRunning: Boolean) {
        withWindowUnlessHiding {
            if (
                !shouldCompleteFreshEscapeHandoff(
                    step = freshEscapeStep.value,
                    placeholderVisible = showFreshPlaceholder.value,
                    animationRunning = animationRunning,
                    windowAvailable = true,
                )
            ) return@withWindowUnlessHiding

            // The native disc has reached the real saved Little Sun rest at its
            // exact size. Cross-fade the two co-located renderers only now.
            freshEscapeStep.value = resolveFreshArrivalEscapeStep(
                escapeRequested = true,
                hasReachedLittleSunTarget = true,
            )
            showFreshPlaceholder.value = false
            skipInteractionToLittleSun()
        }
    }

    internal fun skipInteractionToLittleSun() {
        if (
            shouldPostSkipInteractionToMainThread(
                isMainThread = Looper.myLooper() == Looper.getMainLooper(),
            )
        ) {
            Handler(Looper.getMainLooper()).post { skipInteractionToLittleSun() }
            return
        }

        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.LITTLE_SUN_OVERLAY,
        )
        hideWindow()
    }

    private fun hideFailedWebViewOnMainThread(failedView: WebView?) {
        val expectedView = failedView ?: webViewRef ?: return
        Handler(Looper.getMainLooper()).post {
            // A delayed callback from a disposed WebView must not tear down a
            // newer interaction that has already replaced it.
            if (webViewRef === expectedView) {
                hideWindow()
            }
        }
    }

    private fun resetArrivalState() {
        showCornerPlaceholder.value = false
        showFreshPlaceholder.value = false
        freshSunTarget.value = null
        freshEscapeStep.value = FreshArrivalEscapeStep.NONE
        freshTargetMeasurementAttempts = 0
        freshTargetStability = ArrivalSunTargetStability()
    }

    // Run a near-opaque alpha animation on the overlay window root after load.
    // Animating the window's alpha forces the WindowManager to recomposite the
    // overlay across several frames - the same mechanism the other overlays' fade-in
    // relies on, and the strongest nudge for a stuck first composite. The range is
    // 0.996 -> 1.0 (not 0 -> 1): visually imperceptible, so the opaque-shield
    // guarantee that fadeInDurationMs = 0L exists to provide is preserved and the
    // blocked app never shows through.
    private fun nudgeWindowAlpha() {
        // Go through withWindowUnlessHiding so the "is a hide in flight?" check and
        // the animation start are atomic under hideWindow()'s lock: both animate the
        // same window view, so racing ours in would cancel the fade-out's
        // withEndAction and wedge the window open. hideWindow() can fire off the main
        // thread (a fast JS-bridge dismiss, or onRenderProcessGone), so the guard
        // must hold the lock - not merely assume same-thread ordering.
        withWindowUnlessHiding { root ->
            root.alpha = 0.996f
            root.animate()
                .alpha(1f)
                .setDuration(FIRST_FRAME_ALPHA_NUDGE_MS)
                .start()
        }
    }

    // Re-post an invalidate on each animation frame for a short window after the
    // page loads, so the overlay WebView is forced to schedule and present its
    // first composite even though no native fade animation is driving frames.
    // The web content's own fade-in (driven by JS a beat after load) takes over
    // once it starts animating, so a brief pump is enough to cover the gap.
    //
    // shortcut: this is the redundant half of the belt-and-suspenders
    // (nudgeWindowAlpha is the primary, window-level nudge). If a field repro
    // shows the alpha nudge alone fixes the black screen, delete this; if instead
    // the blind 800ms proves wasteful, gate it on WebView.postVisualStateCallback
    // so it stops at first paint instead of running a fixed duration.
    private fun pumpFirstFrame(view: WebView) {
        // Monotonic clock: a wall-clock jump (NTP / manual change) mid-pump must
        // not cut the burst short or stretch it out.
        val deadline = SystemClock.uptimeMillis() + FIRST_FRAME_PUMP_MS
        val pump = object : Runnable {
            override fun run() {
                if (webViewRef !== view) return
                view.invalidate()
                if (SystemClock.uptimeMillis() < deadline) {
                    view.postOnAnimation(this)
                }
            }
        }
        view.postOnAnimation(pump)
    }

    private fun isPhone(): Boolean {
        val smallestWidth = ctrlSvc.resources.configuration.smallestScreenWidthDp
        return smallestWidth < 600
    }

    override fun getLayoutParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION") return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                    WindowManager.LayoutParams.FLAG_FULLSCREEN or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS,
            PixelFormat.TRANSLUCENT
        ).apply {
            // Position at top-left corner to ensure full coverage
            x = 0
            y = 0

            // Draw under the system bars - including the bottom gesture /
            // navigation bar - so the sky covers the full screen with no
            // uncovered strip. FLAG_LAYOUT_NO_LIMITS only extends the window
            // *frame*; on API 30+ the window still keeps clear of the system-bar
            // insets unless we opt out here, and the legacy systemUiVisibility /
            // FLAG_FULLSCREEN flags above are inert on modern Android (15/16).
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                fitInsetsTypes = 0
            }

            // Add soft input mode to handle keyboard smoothly
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
                    WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN

            // Allow drawing into display cutout (notch) area
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }

            // Lock to portrait on phones only (tablets have enough space for landscape)
            if (isPhone()) {
                screenOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
        }
    }

    override fun showWindow() {
        synchronized(this) {
            // Do not let a duplicate or in-flight hide rewrite the placeholder /
            // target state used by the currently visible composition.
            if (isWindowShown()) return

            activeMorphInFromCorner = morphInFromCorner
            resetArrivalState()
            showCornerPlaceholder.value = activeMorphInFromCorner
            showFreshPlaceholder.value = !activeMorphInFromCorner
            activeLoadingSkyBlend = loadingSkyBlendAt(currentLocalHour())

            super.showWindow()
            // CommonWindow may still reject a show while its hide state is being
            // finalized. Leave no armed placeholder behind when it does.
            if (!isWindowShown()) {
                resetArrivalState()
                return
            }

            // Match the nearest Compose loading-sky frame before its first draw;
            // this happens in the same turn as addView, so the window is opaque
            // immediately and never exposes the blocked app beneath it.
            window?.setBackgroundResource(
                activeLoadingSkyBlend.closestFrame.drawableResource()
            )
            // Apply system UI visibility flags to the view after it's created
            @Suppress("DEPRECATION")
            window?.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
    }

    private fun currentLocalHour(): Double {
        val now = Calendar.getInstance()
        return now.get(Calendar.HOUR_OF_DAY) + now.get(Calendar.MINUTE) / 60.0
    }

    /**
     * The web layer has painted its arriving sun at the Little Sun's corner (it
     * targets the same resting point), so cross-fade out the native placeholder
     * that was holding that spot during the WebView load. Hand-off is seamless
     * because both discs sit at the same point. Posted to the main thread (the JS
     * bridge can call in off it). A no-op for a non-morph show.
     */
    fun onArrivingSunReady() {
        Handler(Looper.getMainLooper()).post {
            if (activeMorphInFromCorner) {
                showCornerPlaceholder.value = false
            }
        }
    }

    override fun hideWindow() {
        webViewRef?.stopLoading()
        super.hideWindow()
    }

    override fun onWindowRemoved() {
        webViewRef?.animate()?.cancel()
        webViewRef?.destroy()
        webViewRef = null
        activeMorphInFromCorner = false
        resetArrivalState()
    }
}

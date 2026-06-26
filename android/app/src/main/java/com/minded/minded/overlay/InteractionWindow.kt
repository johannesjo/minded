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
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.viewinterop.AndroidView
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.SunDisc
import com.minded.minded.util.ForwardSafeAreaInsetsToWebView
import com.minded.minded.util.SafeAreaInsetsHolder
import kotlinx.coroutines.delay


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
    }

    override val logTag = javaClass.simpleName

    // Appear as an instantly-opaque shield: the interaction overlay covers the
    // blocked app the user just opened, so it must never be semi-transparent
    // while fading in (which would let a tempting post show through). The smooth
    // appearance happens in the web content (#minded-6622 / .interaction-content
    // fades) that plays on top of this already-solid dark shield.
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

    // Reverse-morph hand-off: while a freshly-shown morph interaction loads its
    // WebView (an opaque dark shield until the web paints), a native sun disc
    // holds the Little Sun's resting corner so that spot is never empty before the
    // web sun appears there. Set true for a morph show (in showWindow), cross-faded
    // out when the web signals its sun has painted (onArrivingSunReady) or by the
    // fallback above — so it can never strand on screen.
    private val showCornerPlaceholder = mutableStateOf(false)


    @SuppressLint("StateFlowValueCalledInComposition")
    @Composable
    override fun Cmp() {
        val win = this;
        val questionId = sharedOverlayViewModel.sharedData.value.lastQuestionForPrompt?.id;
        Log.v(logTag, "questionId: $questionId")

        val webViewState = remember { mutableStateOf<WebView?>(null) }
        ForwardSafeAreaInsetsToWebView(webViewState.value, safeAreaInsetsHolder)

        Box(modifier = Modifier.fillMaxSize()) {
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
                
                // Initially set a dark background to prevent white flash
                this.setBackgroundColor(0xFF1a1a1a.toInt())

                // Deliberately do NOT force LAYER_TYPE_HARDWARE here: a WebView is
                // already hardware-accelerated at the window level, and forcing it
                // onto its own hardware layer inside a TYPE_APPLICATION_OVERLAY +
                // translucent window makes a freshly-created overlay WebView often
                // never composite its first frame — leaving the user on the opaque
                // dark shield (the "black screen on first open, clears on reopen"
                // reports). Let the WebView use the default layer so the first frame
                // paints. We also pump invalidate()s after load (see pumpFirstFrame /
                // onPageFinished) to force that first composite without a tap; only
                // reach for a hardware layer if first-paint flakiness still remains.

                // Set transparent background after page starts loading
                this.webViewClient = object : android.webkit.WebViewClient() {
                    override fun onPageStarted(view: android.webkit.WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        super.onPageStarted(view, url, favicon)
                        // Delay setting transparent background to ensure CSS is loaded
                        view?.postDelayed({
                            view.setBackgroundColor(0x00000000)
                        }, 100)
                    }

                    // Guarantee the first frame composites without needing a tap.
                    // This overlay is a TYPE_APPLICATION_OVERLAY + TRANSLUCENT window
                    // with fadeInDurationMs = 0L, so — unlike the other overlays — no
                    // native alpha animation runs after addView to drive a frame. With
                    // nothing invalidating, a hardware-accelerated overlay WebView can
                    // fail to schedule its first composite and the user is left on the
                    // opaque dark shield; the next touch schedules a frame, which is the
                    // "black screen until I tap it" report. Force that first frame two
                    // ways: a near-opaque window alpha animation (recomposites the whole
                    // overlay window — the lever the other overlays' fade-in proves out)
                    // plus a short burst of view invalidates.
                    override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                        super.onPageFinished(view, url)
                        nudgeWindowAlpha()
                        view?.let { pumpFirstFrame(it) }
                    }

                    // Diagnostics for the "stuck on a black screen" reports: the web
                    // layer goes transparent ~100ms after load, so if it never paints
                    // the dark native shield is what the user sees. A main-frame load
                    // error means the interaction app never booted at all — log it so a
                    // logcat from a repro tells us this is the failure mode.
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
                        }
                    }

                    // A gone render process leaves a blank WebView that only recovers on
                    // a fresh instance — which matches the "clears on reopen" symptom.
                    // Without this override the whole host app process is killed when it
                    // happens; survive it, log whether it crashed vs was reclaimed, and
                    // tear the window down so the user isn't left staring at a dead black
                    // overlay (reopening the app yields a fresh interaction).
                    // shortcut: log-and-teardown — auto re-show the intervention here
                    // once a repro confirms this is the cause.
                    override fun onRenderProcessGone(
                        view: android.webkit.WebView?,
                        detail: android.webkit.RenderProcessGoneDetail?,
                    ): Boolean {
                        Log.e(
                            logTag,
                            "onRenderProcessGone didCrash=${detail?.didCrash()} priorityAtExit=${detail?.rendererPriorityAtExit()}",
                        )
                        win.hideWindow()
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
                val morphQuery = if (win.morphInFromCorner) "?morphInFromCorner=1" else ""
                loadUrl("file:///android_asset/web/src/android/interaction/index.html$morphQuery#${questionId}")
            }
        })

        // Reverse-morph hand-off: hold a sun disc at the Little Sun's resting
        // corner over the loading WebView (an opaque shield until the web paints)
        // so the corner is never empty before the web sun arrives there. It
        // cross-fades out the moment the web signals (onArrivingSunReady), or by
        // the fallback so it can't strand.
        if (morphInFromCorner) {
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


    // Run a near-opaque alpha animation on the overlay window root after load.
    // Animating the window's alpha forces the WindowManager to recomposite the
    // overlay across several frames — the same mechanism the other overlays' fade-in
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
        // must hold the lock — not merely assume same-thread ordering.
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

            // Draw under the system bars — including the bottom gesture /
            // navigation bar — so the sky covers the full screen with no
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
        // Arm the corner placeholder for a morph show BEFORE super.showWindow()
        // composes Cmp(), so the disc is in the very first composition (the web
        // sun won't have loaded yet). Always reassigned, so a non-morph show clears
        // any leftover from a prior morph.
        showCornerPlaceholder.value = morphInFromCorner
        super.showWindow()
        // Apply system UI visibility flags to the view after it's created
        @Suppress("DEPRECATION")
        window?.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
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
            showCornerPlaceholder.value = false
        }
    }

    override fun hideWindow() {
        webViewRef?.stopLoading()
        super.hideWindow()
    }

    override fun onWindowRemoved() {
        webViewRef?.destroy()
        webViewRef = null
    }
}


package com.minded.minded.overlay

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.PixelFormat
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.ForwardSafeAreaInsetsToWebView
import com.minded.minded.util.SafeAreaInsetsHolder


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


    @SuppressLint("StateFlowValueCalledInComposition")
    @Composable
    override fun Cmp() {
        val win = this;
        val questionId = sharedOverlayViewModel.sharedData.value.lastQuestionForPrompt?.id;
        Log.v(logTag, "questionId: $questionId")

        val webViewState = remember { mutableStateOf<WebView?>(null) }
        ForwardSafeAreaInsetsToWebView(webViewState.value, safeAreaInsetsHolder)

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
                    // "black screen until I tap it" report. Pump a short burst of
                    // invalidates after load so the first frame paints on its own.
                    override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                        super.onPageFinished(view, url)
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
                loadUrl("file:///android_asset/web/src/android/interaction/index.html#${questionId}")
            }
        })
    }


    // Re-post an invalidate on each animation frame for a short window after the
    // page loads, so the overlay WebView is forced to schedule and present its
    // first composite even though no native fade animation is driving frames.
    // The web content's own fade-in (driven by JS a beat after load) takes over
    // once it starts animating, so a brief pump is enough to cover the gap.
    private fun pumpFirstFrame(view: WebView) {
        val deadline = System.currentTimeMillis() + FIRST_FRAME_PUMP_MS
        val pump = object : Runnable {
            override fun run() {
                if (webViewRef !== view) return
                view.invalidate()
                if (System.currentTimeMillis() < deadline) {
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
        super.showWindow()
        // Apply system UI visibility flags to the view after it's created
        @Suppress("DEPRECATION")
        window?.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
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


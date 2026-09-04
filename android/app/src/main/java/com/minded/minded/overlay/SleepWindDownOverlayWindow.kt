package com.minded.minded.overlay

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.PixelFormat
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.compose.foundation.layout.Box
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

/**
 * Fullscreen overlay that hosts the bedtime wind-down UI when the user opens
 * a blocked app inside the configured wind-down window. Mirrors the structure
 * of [InteractionWindow] - it loads its own webview entry point that renders
 * `SleepWindDownView` and uses the standard JS bridge for closing the app.
 *
 * Like the intervention, it covers a tempting app the user just opened, so it
 * carries the same shield + first-frame hardening (#196): an instantly-opaque
 * window painted with the clock-matched loading sky, a transparent WebView
 * loading over that sky, and the post-load nudges that make an overlay WebView
 * composite its first frame without a tap.
 */
class SleepWindDownOverlayWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    override val logTag = javaClass.simpleName
    private var webViewRef: WebView? = null
    private val safeAreaInsetsHolder = SafeAreaInsetsHolder()
    override val opensOnLoadingSky: Boolean = true

    // Instantly opaque: the blocked app must never show through a fading-in
    // window. The soft appearance is the web content fading over the native sky.
    override val fadeInDurationMs: Long = 0L

    @SuppressLint("StateFlowValueCalledInComposition")
    @Composable
    override fun Cmp() {
        val win = this
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
                        settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                        this.focusable = focusable

                        // Transparent over the native loading sky from the start:
                        // that sky is the opaque shield, so loading exposes neither
                        // the blocked app nor the WebView's default white surface.
                        // The web page flips to its night sky at 19:00 by the same
                        // clock rule this shield uses for its dark frame (its
                        // index.html), so in the evening window - where wind-down
                        // lives - the two surfaces agree.
                        this.setBackgroundColor(android.graphics.Color.TRANSPARENT)

                        // Deliberately NO LAYER_TYPE_HARDWARE: forcing an overlay
                        // WebView onto its own hardware layer inside a translucent
                        // TYPE_APPLICATION_OVERLAY window often leaves it never
                        // compositing its first frame (see InteractionWindow).

                        this.webViewClient = object : android.webkit.WebViewClient() {
                            override fun onPageStarted(
                                view: android.webkit.WebView?,
                                url: String?,
                                favicon: android.graphics.Bitmap?
                            ) {
                                super.onPageStarted(view, url, favicon)
                                view?.setBackgroundColor(android.graphics.Color.TRANSPARENT)
                            }

                            // Same first-frame hardening as the intervention: with
                            // fadeInDurationMs = 0 no native animation drives a
                            // frame after addView, so force the first composite.
                            override fun onPageFinished(view: android.webkit.WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                nudgeWindowAlpha()
                                view?.let { webView ->
                                    pumpFirstFrame(webView) { webViewRef === webView }
                                }
                            }

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
                                    hideWindowForFailedWebView(view) { webViewRef }
                                }
                            }

                            // Survive a gone render process (the host process would
                            // otherwise be killed) and tear the window down so the
                            // user isn't left on a dead overlay.
                            override fun onRenderProcessGone(
                                view: android.webkit.WebView?,
                                detail: android.webkit.RenderProcessGoneDetail?,
                            ): Boolean {
                                Log.e(
                                    logTag,
                                    "onRenderProcessGone didCrash=${detail?.didCrash()} priorityAtExit=${detail?.rendererPriorityAtExit()}",
                                )
                                hideWindowForFailedWebView(view) { webViewRef }
                                return true
                            }
                        }

                        val jsInterface = SleepWindDownWindowJavaScriptInterface(
                            this,
                            sharedOverlayViewModel,
                            win,
                            ctrlSvc,
                            safeAreaInsets = safeAreaInsetsHolder,
                        )
                        addJavascriptInterface(jsInterface, "androidMinded")
                        loadUrl("file:///android_asset/web/src/android/sleepWindDown/index.html")
                    }
                })
        }
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
            x = 0
            y = 0
            // Draw under the system bars, including the bottom gesture /
            // navigation bar, so the sky covers the full screen with no
            // uncovered strip (see InteractionWindow.getLayoutParams).
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                fitInsetsTypes = 0
            }
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
                    WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
            if (isPhone()) {
                screenOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
            }
        }
    }

    override fun showWindow() {
        synchronized(this) {
            if (isWindowShown()) return
            super.showWindow()
            @Suppress("DEPRECATION")
            window?.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
    }

    override fun hideWindow() {
        webViewRef?.stopLoading()
        super.hideWindow()
    }

    override fun onWindowRemoved() {
        webViewRef?.destroy()
        webViewRef = null
        Log.v(logTag, "onWindowRemoved()")
    }
}

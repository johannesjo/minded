package com.minded.minded.overlay

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.graphics.PixelFormat
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.compose.runtime.Composable
import androidx.compose.ui.viewinterop.AndroidView
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.WebViewSafeAreaBridge

/**
 * Fullscreen overlay that hosts the bedtime wind-down UI when the user opens
 * a blocked app inside the configured wind-down window. Mirrors the structure
 * of [InteractionWindow] — it loads its own webview entry point that renders
 * `SleepWindDownView` and uses the standard JS bridge for closing the app.
 */
class SleepWindDownOverlayWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    override val logTag = javaClass.simpleName
    private var webViewRef: WebView? = null

    @SuppressLint("StateFlowValueCalledInComposition")
    @Composable
    override fun Cmp() {
        val win = this
        AndroidView(factory = { context ->
            WebView(context).also { webViewRef = it }.apply {
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

                this.setBackgroundColor(0xFF1a1a1a.toInt())
                this.setLayerType(View.LAYER_TYPE_HARDWARE, null)

                this.webViewClient = object : android.webkit.WebViewClient() {
                    override fun onPageStarted(
                        view: android.webkit.WebView?,
                        url: String?,
                        favicon: android.graphics.Bitmap?
                    ) {
                        super.onPageStarted(view, url, favicon)
                        view?.postDelayed({
                            view.setBackgroundColor(0x00000000)
                        }, 100)
                    }
                }

                val jsInterface = SleepWindDownWindowJavaScriptInterface(
                    this,
                    sharedOverlayViewModel,
                    win,
                    ctrlSvc
                )
                addJavascriptInterface(jsInterface, "androidMinded")
                WebViewSafeAreaBridge.attach(this, jsInterface.safeAreaInsets)
                loadUrl("file:///android_asset/web/src/android/sleepWindDown/index.html")
            }
        })
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
        super.showWindow()
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
        Log.v(logTag, "onWindowRemoved()")
    }
}

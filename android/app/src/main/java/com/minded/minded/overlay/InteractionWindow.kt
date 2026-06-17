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
                
                // Force hardware acceleration for smoother rendering
                this.setLayerType(View.LAYER_TYPE_HARDWARE, null)
                
                // Set transparent background after page starts loading
                this.webViewClient = object : android.webkit.WebViewClient() {
                    override fun onPageStarted(view: android.webkit.WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        super.onPageStarted(view, url, favicon)
                        // Delay setting transparent background to ensure CSS is loaded
                        view?.postDelayed({
                            view.setBackgroundColor(0x00000000)
                        }, 100)
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


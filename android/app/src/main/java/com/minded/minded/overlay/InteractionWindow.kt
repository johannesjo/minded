package com.minded.minded.overlay

import InteractionWindowJavaScriptInterface
import android.annotation.SuppressLint
import android.graphics.PixelFormat
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.compose.runtime.Composable
import androidx.compose.ui.viewinterop.AndroidView
import com.minded.minded.overlay.data.SharedOverlayViewModel


class InteractionWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
//    private val dashboardViewModel: DashboardViewModel,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY

    override val logTag = javaClass.simpleName


    @SuppressLint("StateFlowValueCalledInComposition")
    @Composable
    override fun Cmp() {
        val win = this;
        val questionId = sharedOverlayViewModel.sharedData.value.lastQuestionForPrompt?.id;
        Log.v(logTag, "questionId: $questionId")

        AndroidView(factory = { context ->
            WebView(context).apply {
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
                // Disable caching to always load fresh content
                settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                this.focusable = focusable
                
                // Initially set a dark background to prevent white flash
                this.setBackgroundColor(0xFF1a1a1a.toInt())
                
                // Force hardware acceleration for smoother rendering
                this.setLayerType(View.LAYER_TYPE_HARDWARE, null)
                
                // Set transparent background after page starts loading
                this.webViewClient = android.webkit.WebViewClient().apply {
                    override fun onPageStarted(view: android.webkit.WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                        super.onPageStarted(view, url, favicon)
                        // Delay setting transparent background to ensure CSS is loaded
                        view?.postDelayed({
                            view.setBackgroundColor(0x00000000)
                        }, 100)
                    }
                }
                
                addJavascriptInterface(
                    InteractionWindowJavaScriptInterface(
                        this,
                        sharedOverlayViewModel,
                        win,
                        ctrlSvc
                    ),
                    "androidMinded"
                )
                loadUrl("file:///android_asset/web/src/android/interaction/index.html#${questionId}")
            }
        })
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
            // Add soft input mode to handle keyboard smoothly
            // ADJUST_NOTHING prevents any resize or pan, avoiding white space
            softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING or
                    WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
            
            // Set window background color to dark to prevent white flashes
            // This is different from the view background and helps during transitions
            @Suppress("DEPRECATION")
            this.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        }
    }
}


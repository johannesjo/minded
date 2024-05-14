package com.minded.minded.overlay

import InteractionWindowJavaScriptInterface
import android.graphics.PixelFormat
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


    @Composable
    override fun Cmp() {
        val win = this;

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
                this.focusable = focusable
                this.setBackgroundColor(0x00000000)
                addJavascriptInterface(
                    InteractionWindowJavaScriptInterface(
                        sharedOverlayViewModel,
                        win,
                        ctrlSvc,
                        this
                    ),
                    "androidMinded"
                )
//                this.requestFocus()
//                Handler(Looper.getMainLooper()).postDelayed({
//                    this.requestFocus()
//                }, 4000) // Delay of 1 second

                // TODO only show the keyboard when there is an input on the page
//                webViewClient = object : WebViewClient() {
//                    override fun onPageFinished(view: WebView, url: String) {
//                        this@apply.requestFocus()
//                        val imm =
//                            context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
//                        imm.showSoftInput(this@apply, InputMethodManager.SHOW_IMPLICIT)
//                    }
//                }

                loadUrl("file:///android_asset/web/src/android/interaction/index.html")
            }
        })
    }


    override fun getLayoutParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION") return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT
        )
    }
}


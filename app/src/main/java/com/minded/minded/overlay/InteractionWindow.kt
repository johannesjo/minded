package com.minded.minded.overlay

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
        AndroidView(factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                loadUrl("https://www.google.com")
            }
        })

//        InteractionOverlayBig(
//            sharedOverlayViewModel = sharedOverlayViewModel,
//            onSuccess = {
//                OverlayControllerService.showOverlay(
//                    ctrlSvc,
//                    OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY
//                )
//                hideWindow()
//                GlobalScope.launch {
//                    delay(1000)  // delay for 1000 milliseconds (1 second)
//                    hideWindow()
//                }
//            },
//            onSkip = {
//                sharedOverlayViewModel.resetAnswerTxt()
//                OverlayControllerService.showOverlay(
//                    ctrlSvc,
//                    OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
//                )
//                hideWindow()
//            }
//        )
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


package com.minded.minded.overlay

import android.content.Context
import android.graphics.PixelFormat
import android.util.Log
import android.util.TypedValue
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.SmallMsg


class SmallMsgWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    override val logTag = javaClass.simpleName




    @Composable
    override fun Cmp() {
        val sharedData by sharedOverlayViewModel.sharedData.collectAsState()
        val context = LocalContext.current
        val isQuestion: Boolean = sharedData.answerTxt == null
        val reminderTxt =
            if (isQuestion) ((sharedData.lastQuestionForPrompt?.t ?: "") + "?") else sharedData.answerTxt
                ?: ""
        Log.v(logTag, "Cmp() isQuestion ${isQuestion} reminderTxt:${sharedData.answerTxt}")


        SmallMsg(msg = reminderTxt, onMsgTap = {
            Log.v(logTag, "onMsgTap() isQuestion:${isQuestion}")
            if (isQuestion) {
                OverlayControllerService.showOverlay(
                    context,
                    OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY,
                    null,
                    sharedData.currentApp
                )
            } else {
                ctrlSvc.userDrivenClose()
            }
        }, onCountdownComplete = {
            Log.v(logTag, "onCountdownComplete()")
            hideWindow()
        })
    }

    override fun getLayoutParams(): WindowManager.LayoutParams {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_BLUR_BEHIND, // Add FLAG_NOT_FOCUSABLE
            PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.START or android.view.Gravity.BOTTOM
        // size of LittleSun somehow units don't match
        params.x = dpToPx(ctrlSvc, 52.dp.value)
        return params;
    }

    private fun dpToPx(context: Context, dp: Float): Int {
        return TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            dp,
            context.resources.displayMetrics
        ).toInt()
    }
}


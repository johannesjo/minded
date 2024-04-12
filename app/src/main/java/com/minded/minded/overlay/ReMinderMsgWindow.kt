package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.compose.ReminderMsg


class ReMinderMsgWindow(
    private val ctrlSvc: OverlayControllerService,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY
    override val logTag = javaClass.simpleName

    private var questionForPrompt: QuestionForPrompt? = null
    private var answerTxt: String? = null


    private fun isQuestion(): Boolean {
        return answerTxt == null
    }



    @Composable
    override fun Cmp() {
        val context = LocalContext.current
        val reminderTxt = if (isQuestion()) (questionForPrompt?.t + '?') else answerTxt ?: ""
        Log.v(logTag, "onMsgTap() isQuestion()")


        ReminderMsg(msg = reminderTxt, onMsgTap = {
            Log.v(logTag, "onMsgTap() ${isQuestion()}")
            if (isQuestion()) {
                OverlayControllerService.showOverlay(
                    context,
                    OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY
                )
            } else {
                userDrivenClose()
            }
            hideWindow()
        }, onCountdownComplete = {
            Log.v(logTag, "onCountdownComplete()")
            hideWindow()
        })
    }

    override fun getLayoutParams(): WindowManager.LayoutParams {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_BLUR_BEHIND, // Add FLAG_NOT_FOCUSABLE
            PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.START or android.view.Gravity.BOTTOM
        return params;
    }
}


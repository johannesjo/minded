package com.minded.minded.overlay

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.compose.ReminderMsg


class ReMinderMsgOverlayService : CommonOverlayService() {
    private var questionForPrompt: QuestionForPrompt? = null
    private var answerTxt: String? = null


    private fun isQuestion(): Boolean {
        return answerTxt == null
    }

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_QUESTION)) {
            questionForPrompt =
                intent.getSerializableExtra(INTENT_EXTRA_QUESTION) as QuestionForPrompt
            answerTxt = null
        }
        if (intent.hasExtra(INTENT_EXTRA_ANSWER_TXT)) {
            questionForPrompt = null
            answerTxt = intent.getStringExtra(INTENT_EXTRA_ANSWER_TXT)
        }
        if (isQuestion()) (questionForPrompt?.t + '?') else answerTxt ?: ""

        return super.onStartCommand(intent, flags, startId)
    }


    @Composable
    override fun Cmp() {
        val context = LocalContext.current
        val reminderTxt = if (isQuestion()) (questionForPrompt?.t + '?') else answerTxt ?: ""
        Log.v(logTag, "onMsgTap() isQuestion()")


        ReminderMsg(msg = reminderTxt, onMsgTap = {
            Log.v(logTag, "onMsgTap() ${isQuestion()}")
            if (isQuestion()) {
                QuestionOverlayService.showOverlay(context, questionForPrompt = questionForPrompt)
            } else {
                userDrivenClose()
            }
            hideOverlay(context)
        }, onCountdownComplete = {
            Log.v(logTag, "onCountdownComplete()")
            hideOverlay(context)
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


    companion object {
        private const val INTENT_EXTRA_ANSWER_TXT = "INTENT_EXTRA_ANSWER_TXT"
        private const val INTENT_EXTRA_QUESTION = "INTENT_EXTRA_QUESTION"


        internal fun showOverlay(
            context: Context,
            questionForPrompt: QuestionForPrompt? = null,
            answerTxt: String? = null
        ) {
            val intent = Intent(context, ReMinderMsgOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)

            if (questionForPrompt != null) {
                intent.putExtra(INTENT_EXTRA_QUESTION, questionForPrompt)
            }
            if (answerTxt != null) {
                intent.putExtra(INTENT_EXTRA_ANSWER_TXT, answerTxt)
            }
            context.startService(intent)
        }


        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, ReMinderMsgOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


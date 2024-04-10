package com.minded.minded

import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.compose.AfterSun

val AFTER_SUN_CYCLE_DURATION_IN_S = 60

@Suppress("DEPRECATION")
class AfterSunOverlayService : CommonOverlayService() {
    private var questionForPrompt: QuestionForPrompt? = null
    private var answerTxt: String? = null


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

        return super.onStartCommand(intent, flags, startId)
    }


    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            startTimer()
        }

        AfterSun(elapsedSeconds, {
            Log.v(logTag, "onSunTap()")
            userDrivenClose();
        })
    }

    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
//            Log.v(logTag, "elapsedSeconds: $elapsedSeconds")
            elapsedSeconds++
            handler.postDelayed(this, 1000)
            if (elapsedSeconds % AFTER_SUN_CYCLE_DURATION_IN_S == 0 && isOverlayShown() && elapsedSeconds > 0) {
                ReMinderMsgOverlayService.showOverlay(
                    applicationContext,
                    questionForPrompt,
                    answerTxt
                )
            }
        }
    }

    override fun hideOverlay() {
        super.hideOverlay()
        stopTimer()
    }

    private fun startTimer() {
        Log.v(logTag, "startTimer()")
        stopTimer()
        elapsedSeconds = 0
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }


    companion object {
        private const val INTENT_EXTRA_ANSWER_TXT = "INTENT_EXTRA_ANSWER_TXT"
        private const val INTENT_EXTRA_QUESTION = "INTENT_EXTRA_QUESTION"

        internal fun showOverlay(
            context: Context,
            questionForPrompt: QuestionForPrompt? = null,
            answerTxt: String? = null
        ) {
            val intent = Intent(context, AfterSunOverlayService::class.java)
            intent.putExtra(CommonOverlayService.Companion.INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)

            if (questionForPrompt != null) {
                intent.putExtra(INTENT_EXTRA_QUESTION, questionForPrompt)
            }
            if (answerTxt != null) {
                intent.putExtra(INTENT_EXTRA_ANSWER_TXT, answerTxt)
            }
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, AfterSunOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


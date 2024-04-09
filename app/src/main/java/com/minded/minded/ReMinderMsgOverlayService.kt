package com.minded.minded

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import com.minded.minded.ui.compose.ReminderMsg
import kotlinx.coroutines.delay


val SHOW_REMINDER_DURATION_IN_S = 10

class ReMinderMsgOverlayService : CommonOverlayService() {
    private var lastQuestionTxt: String = ""


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        Log.v(logTag, intent.getStringExtra(INTENT_EXTRA_TOAST_TXT) ?: "")
        if (intent.hasExtra(INTENT_EXTRA_TOAST_TXT)) {
            lastQuestionTxt = intent.getStringExtra(INTENT_EXTRA_TOAST_TXT) ?: ""
        }
        return super.onStartCommand(intent, flags, startId)
    }


    @Composable
    override fun Cmp() {
        val context = LocalContext.current
        LaunchedEffect(Unit) {
            delay(5000) // delay for 10 seconds
            hideOverlay(context)
        }
        ReminderMsg(msg = lastQuestionTxt)
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
        private const val INTENT_EXTRA_TOAST_TXT = "INTENT_EXTRA_TOAST_TXT"

        internal fun showOverlay(context: Context, toastTxt: String) {
            Log.v("ReMinderMsgOverlaySVC", "showOverlay() $toastTxt")
            val intent = Intent(context, ReMinderMsgOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_TOAST_TXT, toastTxt)
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, ReMinderMsgOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


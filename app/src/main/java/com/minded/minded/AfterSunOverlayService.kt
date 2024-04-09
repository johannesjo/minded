package com.minded.minded

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import android.widget.Toast
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.minded.minded.ui.compose.AfterSun

val AFTER_SUN_CYCLE_DURATION_IN_S = 60

class AfterSunOverlayService : CommonOverlayService() {
    private var lastQuestionTxt: String = ""


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        Log.v(tag, intent.getStringExtra(INTENT_EXTRA_TOAST_TXT) ?: "")
        if (intent.hasExtra(INTENT_EXTRA_TOAST_TXT)) {
            lastQuestionTxt = intent.getStringExtra(INTENT_EXTRA_TOAST_TXT) ?: ""
        }
        return super.onStartCommand(intent, flags, startId)
    }


    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            startTimer()
        }

        AfterSun(elapsedSeconds, {
            Log.v("AfterSunOverlaySVC", "onSunTap()")
            userDrivenClose();
        })
    }

    private fun userDrivenClose() {
        Log.v("QuestionOverlaySVC", "userDrivenClose()")
        stopTimer()
        Toast.makeText(applicationContext, "Welcome back! \uD83C\uDF1E", Toast.LENGTH_SHORT).show()
        hideOverlay()
        // TODO count to DB
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
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
        return params;
    }


    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
//            Log.v("AfterSunOverlaySVC", "elapsedSeconds: $elapsedSeconds")
            elapsedSeconds++
            handler.postDelayed(this, 1000)
            if (elapsedSeconds % AFTER_SUN_CYCLE_DURATION_IN_S == 0 && isOverlayShown() && elapsedSeconds > 0) {

                Toast.makeText(
                    this@AfterSunOverlayService,
                    lastQuestionTxt + "?",
                    Toast.LENGTH_LONG
                ).show();
            }
        }
    }

    // ...

    private fun startTimer() {
        Log.v("AfterSunOverlaySVC", "startTimer()")
        elapsedSeconds = 0
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }


    companion object {
        private const val INTENT_EXTRA_TOAST_TXT = "INTENT_EXTRA_TOAST_TXT"

        internal fun showOverlay(context: Context, toastTxt: String) {
            val intent = Intent(context, AfterSunOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_TOAST_TXT, toastTxt)
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, AfterSunOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


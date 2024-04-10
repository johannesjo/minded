package com.minded.minded

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import com.minded.minded.ui.compose.SuccessSun


class SuccessSunOverlayService : CommonOverlayService() {
    private val defaultSunTxt = "tap sun to close"
    private var text: String = defaultSunTxt
    private var isShowAfterSunAfter: Boolean = false
    private var answerTxt: String? = null


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
//            AfterSunOverlayService.hideOverlay(this)
//            ReMinderMsgOverlayService.hideOverlay(this)
        }
        if (intent.hasExtra(INTENT_EXTRA_TEXT)) {
            text = intent.getStringExtra(INTENT_EXTRA_TEXT) ?: defaultSunTxt
        }
        if (intent.hasExtra(INTENT_SHOW_AFTER_SUN_AFTER)) {
            isShowAfterSunAfter = intent.getBooleanExtra(INTENT_SHOW_AFTER_SUN_AFTER, false)
        }
        if (intent.hasExtra(INTENT_EXTRA_ANSWER_TXT)) {
            answerTxt = intent.getStringExtra(INTENT_EXTRA_ANSWER_TXT)
        }

        return super.onStartCommand(intent, flags, startId)
    }


    @Composable
    override fun Cmp() {
        SuccessSun(text,
            onAfterTapSun = {
                Log.v(logTag, "onTapSun()")
                userDrivenClose();
            },
            onAfterShow = {
                Log.v(logTag, "onAfterShow()")
                if (isShowAfterSunAfter) {
                    AfterSunOverlayService.showOverlay(
                        applicationContext,
                        answerTxt = answerTxt
                    )
                }

                hideOverlay()
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

    companion object {
        const val INTENT_EXTRA_TEXT = "INTENT_EXTRA_TEXT"
        const val INTENT_SHOW_AFTER_SUN_AFTER = "INTENT_SHOW_AFTER_SUN_AFTER"
        const val INTENT_EXTRA_ANSWER_TXT = "INTENT_EXTRA_ANSWER_TXT"


        internal fun showOverlay(
            context: Context,
            isShowAfterSunAfter: Boolean = false,
            answerTxt: String? = null,
            sunTxt: String? = null,
        ) {
            val intent = Intent(context, SuccessSunOverlayService::class.java)
            intent.putExtra(CommonOverlayService.Companion.INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            intent.putExtra(INTENT_SHOW_AFTER_SUN_AFTER, isShowAfterSunAfter)
            intent.putExtra(INTENT_EXTRA_ANSWER_TXT, answerTxt)
            intent.putExtra(INTENT_EXTRA_TEXT, sunTxt)
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, SuccessSunOverlayService::class.java)
            intent.putExtra(CommonOverlayService.Companion.INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


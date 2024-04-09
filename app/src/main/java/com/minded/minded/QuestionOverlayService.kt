package com.minded.minded

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.compose.OverlayBig
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.util.getQuestionSmart
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit


class QuestionOverlayService : CommonOverlayService() {

    private var lastForeGroundApp: String = ""
    private lateinit var dashboardViewModel: DashboardViewModel
    private var isInGracePeriod = false
    private val GRACE_PERIOD = 30


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            AfterSunOverlayService.hideOverlay(this)
        }
        val currentPackage =
            intent.getStringExtra(MyAccessibilityService.INTENT_EXTRA_CURRENT_PACKAGE_NAME)
        Log.v("QuestionOverlaySVC", "onStartCommand() $currentPackage")
        if (currentPackage != null) {
            checkToShowOverlay(currentPackage)
        }
        return START_NOT_STICKY
    }

    private fun isBlockedPackage(packageName: String): Boolean {
        return packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
    }


    private fun checkToShowOverlay(currentPackageName: String) {
        Log.v(
            "QuestionOverlaySVC",
            "checkToShowOverlay() $isInGracePeriod ${isBlockedPackage(currentPackageName)} $lastForeGroundApp"
        )

        // TODO check if needed
//        if (!isBlockedPackage(currentPackageName)) {
//            hideOverlay();
//        }

        if (currentPackageName == "com.google.android.apps.nexuslauncher") {
            hideOverlay();
            AfterSunOverlayService.hideOverlay(this)
        }

        if (!isInGracePeriod && isBlockedPackage(currentPackageName) && lastForeGroundApp != currentPackageName) {
            Log.v("QuestionOverlaySVC", "SHOW OVERLAY for: $currentPackageName")
            lastForeGroundApp = currentPackageName
            showOverlay()
            isInGracePeriod = true
            Executors.newSingleThreadScheduledExecutor()
                .schedule({ isInGracePeriod = false }, GRACE_PERIOD.toLong(), TimeUnit.SECONDS)
        }
        if (!isInGracePeriod) {
            lastForeGroundApp = currentPackageName
        }
    }


    @Composable
    override fun Cmp() {
        var answerTxt: String? = null
        var rndQuestion by remember { mutableStateOf<QuestionForPrompt?>(null) }

        LaunchedEffect(Unit) {
            rndQuestion = getQuestionSmart(emptyList())
        }

        rndQuestion?.let { question ->
            OverlayBig(
                endOverlay = {
                    hideOverlay()
                },
                rndQuestion = question,
                onSubmitAnswer = {
                    Log.v("QuestionOverlaySVC", "onSubmitAnswer: $it")
                    dashboardViewModel.addAnswer(it, question.categoryId)
                    answerTxt = if (it.length > 0) it else null
                },
                onBackToMain = {
                    Log.v("QuestionOverlaySVC", "onBackToMain")
                    userDrivenClose();
                },
                onShowAfterSun = {
                    Log.v("QuestionOverlaySVC", "onShowAfterSun")
                    val txt = answerTxt ?: question.t
                    AfterSunOverlayService.showOverlay(this@QuestionOverlayService, txt)
                }
            )
        }
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
        internal fun showOverlay(context: Context) {
            val intent = Intent(context, QuestionOverlayService::class.java)
            intent.putExtra(CommonOverlayService.Companion.INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            context.startService(intent)
            AfterSunOverlayService.hideOverlay(context)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, QuestionOverlayService::class.java)
            intent.putExtra(CommonOverlayService.Companion.INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


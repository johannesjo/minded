package com.minded.minded.overlay

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
import com.minded.minded.MyAccessibilityService
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.AnswerRepository
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
    private var questionToShow: QuestionForPrompt? = null

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            AfterSunOverlayService.hideOverlay(this)
            ReMinderMsgOverlayService.hideOverlay(this)
        }
        if (intent.hasExtra(INTENT_EXTRA_QUESTION)) {
            questionToShow =
                intent.getSerializableExtra(INTENT_EXTRA_QUESTION) as? QuestionForPrompt
        }
        val currentPackage =
            intent.getStringExtra(MyAccessibilityService.INTENT_EXTRA_CURRENT_PACKAGE_NAME)
        Log.v(logTag, "onStartCommand() $currentPackage")
        if (currentPackage != null) {
            checkToShowOverlay(currentPackage)
        }
        return super.onStartCommand(intent, flags, startId)
    }

    private fun isBlockedPackage(packageName: String): Boolean {
        return packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
    }


    private fun checkToShowOverlay(currentPackageName: String) {
        Log.v(
            logTag,
            "checkToShowOverlay() $isInGracePeriod ${isBlockedPackage(currentPackageName)} $lastForeGroundApp"
        )

        // TODO check if needed
        if (!isBlockedPackage(currentPackageName)) {
            hideOverlay();
        }

        if (currentPackageName == "com.google.android.apps.nexuslauncher") {
            hideOverlay();
            AfterSunOverlayService.hideOverlay(this)
        }

        if (!isInGracePeriod && isBlockedPackage(currentPackageName) && lastForeGroundApp != currentPackageName) {
            Log.v(logTag, "SHOW OVERLAY for: $currentPackageName")
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


    override fun onCreate() {
        val answerRepository = AnswerRepository(this)
        dashboardViewModel = DashboardViewModel(answerRepository)
        super.onCreate()
    }

    @Composable
    override fun Cmp() {
        var answerTxt: String? = null
        var rndQuestion by remember { mutableStateOf<QuestionForPrompt?>(null) }

        LaunchedEffect(Unit) {
            Log.v(logTag, "Cmp() ${questionToShow?.t}")
            if (questionToShow != null) {
                rndQuestion = questionToShow
            } else {
                rndQuestion = getQuestionSmart(emptyList())
            }
        }

        rndQuestion?.let { question ->
            OverlayBig(
                rndQuestion = question,
                onSubmitAnswer = {
                    Log.v(logTag, "onSubmitAnswer: $it")
                    dashboardViewModel.addAnswer(it, question.categoryId)
                    answerTxt = if (it.length > 0) it else null
                    SuccessSunOverlayService.showOverlay(
                        this@QuestionOverlayService,
                        isShowAfterSunAfter = true,
                        answerTxt = answerTxt
                    )
                    hideOverlay()
                },
                onSkip = {
                    AfterSunOverlayService.showOverlay(this@QuestionOverlayService, question)
                    hideOverlay()
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
        const val INTENT_EXTRA_QUESTION = "INTENT_EXTRA_QUESTION"

        internal fun showOverlay(
            context: Context,
            questionForPrompt: QuestionForPrompt? = null,
        ) {
            val intent = Intent(context, QuestionOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            if (questionForPrompt != null) {
                intent.putExtra(INTENT_EXTRA_QUESTION, questionForPrompt)
            }
            context.startService(intent)
            AfterSunOverlayService.hideOverlay(context)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, QuestionOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


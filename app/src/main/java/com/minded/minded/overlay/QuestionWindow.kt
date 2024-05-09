package com.minded.minded.overlay

import android.graphics.PixelFormat
import android.util.Log
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.QuestionOverlayBig
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.util.getQuestionSmart
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


class QuestionWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
    private val dashboardViewModel: DashboardViewModel,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {
    private val selfEnum = OverlayControllerService.Companion.OverlayName.QUESTION_OVERLAY

    override val logTag = javaClass.simpleName


    @Composable
    override fun Cmp() {
        val sharedData by sharedOverlayViewModel.sharedData.collectAsState()
        var rndQuestion by remember { mutableStateOf<QuestionForPrompt?>(null) }

        LaunchedEffect(Unit) {
            Log.v(logTag, "Cmp() ${sharedData.questionForPrompt?.t}")
            if (sharedData.questionForPrompt != null) {
                rndQuestion = sharedData.questionForPrompt
            } else {
                rndQuestion = getQuestionSmart(emptyList())
            }
        }

        rndQuestion?.let { question ->
            QuestionOverlayBig(
                rndQuestion = question,
                onSubmitAnswer = {
                    Log.v(logTag, "onSubmitAnswer: $it")
                    dashboardViewModel.addAnswer(it, question.categoryId, question.id)
                    sharedOverlayViewModel.updateSharedData(answerTxt = it)

                    OverlayControllerService.showOverlay(
                        ctrlSvc,
                        OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY
                    )
//                    hideWindow()
                    GlobalScope.launch {
                        delay(1000)  // delay for 1000 milliseconds (1 second)
                        hideWindow()
                    }
                },
                onChangeQuestion = {
                    Log.v(logTag, "onChangeQuestion")
                    // TODO consider answers here as well
                    val rndQuestionBefore = rndQuestion;
                    rndQuestion = getQuestionSmart(emptyList())
                    if (rndQuestionBefore == rndQuestion) {
                        Log.v(logTag, "onChangeQuestion: same question")
                        rndQuestion = getQuestionSmart(emptyList())
                    }
                },
                onSkip = {
                    sharedOverlayViewModel.resetAnswerTxt()
                    OverlayControllerService.showOverlay(
                        ctrlSvc,
                        OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
                    )
                    hideWindow()
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
}


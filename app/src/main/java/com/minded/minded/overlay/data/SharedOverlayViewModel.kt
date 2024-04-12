package com.minded.minded.overlay.data

import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.Answer
import com.minded.minded.util.getQuestionSmart
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update


data class SharedOverlayData(
    var questionForPrompt: QuestionForPrompt? = null,
    var answerTxt: String? = null,
    var sunTxt: String? = null,
    var isShowAfterSunAfterSuccess: Boolean = true,
)

class SharedOverlayViewModel {
    private val _sharedData = MutableStateFlow(SharedOverlayData())
    val sharedData: StateFlow<SharedOverlayData> = _sharedData.asStateFlow()


    fun updateSharedData(
        questionForPrompt: QuestionForPrompt? = null,
        answerTxt: String? = null,
        sunTxt: String? = null,
        isShowAfterSunAfterSuccess: Boolean? = null
    ) {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(
            questionForPrompt = questionForPrompt ?: currentData.questionForPrompt,
            answerTxt = answerTxt ?: currentData.answerTxt,
            sunTxt = sunTxt ?: currentData.sunTxt,
            isShowAfterSunAfterSuccess = isShowAfterSunAfterSuccess
                ?: currentData.isShowAfterSunAfterSuccess
        )
        _sharedData.update { newSharedData }
    }

    fun setRndQuestion(answerList: List<Answer> = emptyList()) {
        val q = getQuestionSmart(answerList)
        updateSharedData(questionForPrompt = q)
    }

    fun reset(answerList: List<Answer> = emptyList()) {
        _sharedData.update {
            SharedOverlayData(
                isShowAfterSunAfterSuccess = true,
                answerTxt = null,
                questionForPrompt = getQuestionSmart(answerList),
                sunTxt = null,
            )
        }
    }
}

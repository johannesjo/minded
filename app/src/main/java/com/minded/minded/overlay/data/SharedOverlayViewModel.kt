package com.minded.minded.overlay.data

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.util.getQuestionSmart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch


data class SharedOverlayData(
    var questionForPrompt: QuestionForPrompt? = null,
    var answerTxt: String? = null,
    var sunTxt: String? = null,
    var isShowAfterSunAfterSuccess: Boolean = true,
)

class SharedOverlayViewModel(private val answerRepository: AnswerRepository) : ViewModel() {
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

    fun setRndQuestion() {
        viewModelScope.launch {
            answerRepository.getAllAnswersFlow().flowOn(Dispatchers.IO)
                .collect { answers: List<Answer> ->
                    Log.v("SharedOverlayViewModel", "answers: $answers ${answers.size}")
                    val q = getQuestionSmart(answers)
                    Log.v("SharedOverlayViewModel", "question: $q ${q.t}")
                    updateSharedData(questionForPrompt = q)
                }
        }
    }

    fun reset() {
        _sharedData.update {
            SharedOverlayData(
                isShowAfterSunAfterSuccess = true,
                answerTxt = null,
                questionForPrompt = getQuestionSmart(emptyList()),
                sunTxt = null,
            )
        }
        setRndQuestion()
    }
}

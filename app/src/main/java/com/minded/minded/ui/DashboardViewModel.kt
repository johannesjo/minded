package com.minded.minded.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.minded.minded.data.Answer
import com.minded.minded.data.QUESTIONS
import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QUESTION_CATEGORIES_ON_DASHBOARD
import com.minded.minded.data.QuestionCategory
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.ui.compose.AnswerRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

open class DashboardViewModel(private val answerRepository: AnswerRepository) : ViewModel() {
    // Game UI state
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadAnswers()
    }

    private fun mapAnswersToQuestions(allAnswers: List<Answer>): List<QuestionCategoryForDashboard> {
        return QUESTION_CATEGORIES_ON_DASHBOARD.map { questionCategoryId ->
            val qc = QUESTION_CATEGORIES[questionCategoryId]
                ?: error("No question category for $questionCategoryId")
            QuestionCategoryForDashboard(
                qc.dashboardTxt,
                questionCategoryId,
                answers = allAnswers.filter { answer -> questionCategoryId == answer.questionCategoryId },
                qc.isTodayOnlyCategory,
                qc.isThisWeekOnlyCategory,
                qc.isQuestionLessWidget,
            )
        }.filter { it.answers.isNotEmpty() }
    }

    private fun loadAnswers() {
        viewModelScope.launch {
            val answers = fetchAnswers()
            val d = mapAnswersToQuestions(answers);
            _uiState.value = DashboardUiState(d)
        }
    }


    private suspend fun fetchAnswers(): List<Answer> {
        return withContext(Dispatchers.IO) {
            answerRepository.getAllAnswers()
        }
    }
}

package com.minded.minded.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.minded.minded.data.Answer
import com.minded.minded.data.QUESTIONS
import com.minded.minded.data.QUESTION_CATEGORIES
import com.minded.minded.data.QUESTION_CATEGORIES_ON_DASHBOARD
import com.minded.minded.data.QuestionCategory
import com.minded.minded.ui.compose.AnswerRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class DashboardViewModel(private val answerRepository: AnswerRepository) : ViewModel() {
    // Game UI state
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        _uiState.value = DashboardUiState(QUESTION_CATEGORIES_ON_DASHBOARD.map {
            QUESTION_CATEGORIES[it] ?: error("No question category for $it")
        })
//        loadAnswers()
    }

    private fun loadAnswers() {
        viewModelScope.launch {
            val answers = fetchAnswers()
            _uiState.value = DashboardUiState(uiState.value.questionCategories)
        }
    }


    private suspend fun fetchAnswers(): List<Answer> {
        return withContext(Dispatchers.IO) {
            answerRepository.getAllAnswers()
        }
    }
}

package com.minded.minded.ui.model

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.minded.minded.MissingCapability
import com.minded.minded.data.QuestionCategoryForDashboard
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.answers.Answer
import com.minded.minded.data.answers.AnswerRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch


open class DashboardViewModel(private val answerRepository: AnswerRepository) : ViewModel() {
    // Game UI state
    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadAnswersFlow()
    }

    private fun mapAnswersToQuestions(allAnswers: List<Answer>): List<QuestionCategoryForDashboard> {
        return com.minded.minded.util.mapAnswersToQuestions(allAnswers)
    }


    /**
     * @see https://stackoverflow.com/questions/75549490/how-should-i-use-room-database-among-with-coroutines-and-flow
     * This function is used to get all the answers from the database, and update the value of favoriteBooks.
     * 1. viewModelScope.launch is used to launch a coroutine within the viewModel lifecycle.
     * 2. answerRepository.getAll() is used to get all the answers from the database.
     * 3. flowOn(Dispatchers.IO) is used to change the dispatcher of the flow to IO, which is optimal for IO operations, and does not block the main thread.
     * 4. collect is a suspending function used to collect the flow of answers list, and assign the value to favoriteBooks.
     * 5. each time the flow emits a new value, the collect function will be called with the list of answers.
     */
    fun loadAnswersFlow() {
        viewModelScope.launch {
            answerRepository.getAllAnswersFlow().flowOn(Dispatchers.IO)
                .collect { answers: List<Answer> ->
                    val d = mapAnswersToQuestions(answers);
                    _uiState.update { it.copy(questionCategories = d) }
                }
        }
    }

    /**
     * This function is used to add a answer to the database.
     * 1. viewModelScope.launch is used to launch a coroutine within the viewModel lifecycle.
     * 2. Dispatchers.IO is used to change the dispatcher of the coroutine to IO, which is optimal for IO operations, and does not block the main thread.
     * 3. answerRepository.add(answer) is used to add the answer to the database.
     */
    fun addAnswer(title: String, categoryId: QuestionCategoryId, questionId: String) {
        viewModelScope.launch(Dispatchers.IO) {
            answerRepository.createWithTimestamp(title, categoryId, questionId)
        }
    }

    /**
     * This function is used to remove a answer from the database.
     * 1. viewModelScope.launch is used to launch a coroutine within the viewModel lifecycle.
     * 2. Dispatchers.IO is used to change the dispatcher of the coroutine to IO, which is optimal for IO operations, and does not block the main thread.
     * 3. answerRepository.remove(answer) is used to remove the answer from the database.
     */
    fun removeAnswer(answer: Answer) {
        viewModelScope.launch(Dispatchers.IO) {
            answerRepository.removeAnswer(answer)
        }
    }

    fun addMissingCapability(missingCapability: MissingCapability) {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.update {
                val newList = it.missingCapabilities.toMutableList()
                newList.add(missingCapability)
                it.copy(missingCapabilities = newList)
            }
        }
    }

    fun setMissingCapabilities(missingCapabilities: List<MissingCapability>) {
        viewModelScope.launch(Dispatchers.IO) {
            _uiState.update {
                it.copy(missingCapabilities = missingCapabilities)
            }
        }
    }
}

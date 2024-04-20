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
import java.time.Instant


data class AppEntry(
    val lastUsed: Instant = Instant.now(),
    var sessionDurationInS: Int = -1
)

typealias AppMap = Map<String, AppEntry>

data class SharedOverlayData(
    var currentApp: String? = null,
    var questionForPrompt: QuestionForPrompt? = null,
    var answerTxt: String? = null,
    var sunTxt: String? = null,
    var isShowLittleSunAfterSuccess: Boolean = true,
    var appMap: AppMap = emptyMap()
)

class SharedOverlayViewModel(private val answerRepository: AnswerRepository) : ViewModel() {
    private val lt = javaClass.simpleName
    private val _sharedData = MutableStateFlow(SharedOverlayData())
    val sharedData: StateFlow<SharedOverlayData> = _sharedData.asStateFlow()


    fun getCurrentAppDuration(): Int {
        val appName =
            sharedData.value.currentApp ?: throw IllegalStateException("currentApp is null")
        val appEntry = sharedData.value.appMap[appName]
        if (appEntry == null) {
            return 0;
        }

        return appEntry.sessionDurationInS
    }

    fun updateSharedData(
        currentApp: String? = null,
        questionForPrompt: QuestionForPrompt? = null,
        answerTxt: String? = null,
        sunTxt: String? = null,
        isShowLittleSunAfterSuccess: Boolean? = null
    ) {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(
            currentApp = currentApp ?: currentData.currentApp,
            appMap = currentData.appMap,
            questionForPrompt = questionForPrompt ?: currentData.questionForPrompt,
            answerTxt = answerTxt ?: currentData.answerTxt,
            sunTxt = sunTxt ?: currentData.sunTxt,
            isShowLittleSunAfterSuccess = isShowLittleSunAfterSuccess
                ?: currentData.isShowLittleSunAfterSuccess
        )
        Log.v(lt, "updateSharedData() ${newSharedData}")
        _sharedData.update { newSharedData }
    }

    fun setRndQuestion() {
        viewModelScope.launch {
            answerRepository.getAllAnswersFlow().flowOn(Dispatchers.IO)
                .collect { answers: List<Answer> ->
                    Log.v(lt, "answers: $answers ${answers.size}")
                    val q = getQuestionSmart(answers)
                    Log.v(lt, "question: $q ${q.t}")
                    updateSharedData(questionForPrompt = q, answerTxt = null)
                }
        }
    }

    fun updateLastAppUsage() {
        val appName =
            sharedData.value.currentApp ?: throw IllegalStateException("currentApp is null")
        val currentData = sharedData.value ?: SharedOverlayData()
        val newAppMap = currentData.appMap.toMutableMap()
        val appEntry = newAppMap[appName] ?: AppEntry()
        Log.v(lt, "updateLastAppUsage() ${appName} ${appEntry} ${newAppMap}")
        newAppMap[appName] = appEntry.copy(lastUsed = Instant.now())
        _sharedData.update { currentData.copy(appMap = newAppMap) }
    }

    fun updateCurrentAppSessionDuration(durationInS: Int) {
        val appName =
            sharedData.value.currentApp ?: throw IllegalStateException("currentApp is null")
        val currentData = sharedData.value
        val newAppMap = currentData.appMap.toMutableMap()
        val appEntry = newAppMap[appName] ?: AppEntry()
        newAppMap[appName] = appEntry.copy(
            lastUsed = Instant.now(),
            sessionDurationInS = durationInS
        )
        Log.v(lt, "updateCurrentAppSessionDuration() ${appName} ${appEntry}")
        _sharedData.update { currentData.copy(appMap = newAppMap) }
    }


    fun resetToFreshRndQuestion(currentApp: String) {
        updateSharedData(
            currentApp = currentApp,
            isShowLittleSunAfterSuccess = true,
            answerTxt = null,
            questionForPrompt = getQuestionSmart(emptyList()),
            sunTxt = null,
        )
        setRndQuestion()
    }
}

package com.minded.minded.overlay.data

import android.util.Log
import androidx.lifecycle.ViewModel
import com.minded.minded.data.QuestionForPrompt
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.time.Instant


enum class InteractionMode {
    Question, MoodSelector;
}


data class AppEntry(
    val lastUsed: Instant = Instant.now(),
    var sessionDurationInS: Int = -1
)

typealias AppMap = Map<String, AppEntry>

data class SharedOverlayData(
    var currentApp: String? = null,
    var lastQuestionForPrompt: QuestionForPrompt? = null,
    var answerTxt: String? = null,
    var successSunTxt: String? = null,
    var appMap: AppMap = emptyMap()
)

class SharedOverlayViewModel(
    initialData: SharedOverlayData = SharedOverlayData()
) : ViewModel() {
    private val lt = javaClass.simpleName
    private val _sharedData = MutableStateFlow(initialData)
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

    // NOTE resetting values to null is not possible
    fun updateSharedData(
        currentApp: String? = null,
        questionForPrompt: QuestionForPrompt? = null,
        answerTxt: String? = null,
        successSunTxt: String? = null,
    ) {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(
            currentApp = currentApp ?: currentData.currentApp,
            appMap = currentData.appMap,
            lastQuestionForPrompt = questionForPrompt ?: currentData.lastQuestionForPrompt,
            answerTxt = answerTxt ?: currentData.answerTxt,
            successSunTxt = successSunTxt ?: currentData.successSunTxt
        )
        Log.v(lt, "updateSharedData() ${newSharedData}")
        _sharedData.update { newSharedData }
    }

    fun unsetQuestion(
    ) {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(
            lastQuestionForPrompt = null,
            answerTxt = null,
        )
        Log.v(lt, "unsetQuestion() ${newSharedData}")
        _sharedData.update { newSharedData }
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


    fun resetAnswerTxt() {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(answerTxt = null)
        _sharedData.update { newSharedData }
        Log.v(lt, "resetAnswerTxt() ${newSharedData}")
    }

    fun resetSunTxt() {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(successSunTxt = null)
        _sharedData.update { newSharedData }
        Log.v(lt, "resetSunTxt() ${newSharedData}")
    }

    fun resetAll(currentApp: String) {
        val currentData = sharedData.value ?: SharedOverlayData()
        val newSharedData = currentData.copy(
            currentApp = currentApp,
            answerTxt = null,
            lastQuestionForPrompt = null,
            successSunTxt = null,
        )
        _sharedData.update { newSharedData }
        Log.v(lt, "resetAll() ${newSharedData}")
    }
}

package com.minded.minded.util

import org.json.JSONArray
import org.json.JSONObject

/** Must match TypeScript DEFAULT_TS_VAL (99) — used to pass isToday() check on fresh data. */
const val DEFAULT_TS_VAL = 99L

private fun jsonObjectToMap(obj: JSONObject): Map<String, Any?> {
    val map = mutableMapOf<String, Any?>()
    obj.keys().forEach { key ->
        val value = obj.get(key)
        map[key] = when (value) {
            is JSONObject -> jsonObjectToMap(value)
            is JSONArray -> jsonArrayToList(value)
            JSONObject.NULL -> null
            else -> value
        }
    }
    return map
}

private fun jsonArrayToList(arr: JSONArray): List<Any?> {
    return List(arr.length()) { i ->
        when (val value = arr.get(i)) {
            is JSONObject -> jsonObjectToMap(value)
            is JSONArray -> jsonArrayToList(value)
            JSONObject.NULL -> null
            else -> value
        }
    }
}

data class UserCfg(
    val isOnboardingComplete: Boolean,
    val blockedHosts: List<String>,
    val blockedApps: List<String>,
    val focusSchedule: Map<String, Any?>?,
    val soundEnabled: Boolean?,
    val sleepWindDown: Map<String, Any?>?,
    val sessionGrace: SessionGraceCfg? = null
)

data class SessionGraceCfg(
    val enabled: Boolean,
    val minutes: Int
)

data class Answer(
    val id: String,
    val qid: String?, // QID is not a known type in Kotlin, so I'm using String
    val questionCategoryId: String, // QuestionCategoryId is not a known type in Kotlin, so I'm using String
    val `val`: Any, // val can be String or Number in TypeScript, so I'm using Any in Kotlin
    val ts: Long
)

data class SessionIntent(
    val id: String
)

data class SessionTarget(
    val kind: String,
    val id: String
)

data class ActiveTimer(
    val endTS: Long,
    val durationS: Int,
    val startedTS: Long? = null,
    val target: SessionTarget? = null,
    val platform: String? = null,
    val intent: SessionIntent? = null
)

data class DailyBudget(
    val globalMinutes: Int,
    val perSiteMinutes: Map<String, Int>?
)

data class DailyUsage(
    val totalSeconds: Int,
    val perSite: Map<String, Int>
)

data class Alternative(
    val id: String,
    val kind: String,
    val label: String,
    val url: String? = null,
    val packageName: String? = null,
    val createdTS: Long,
    val lastShownTS: Long? = null,
    val shownCount: Int,
    val dismissedCount: Int,
    val openedCount: Int,
    val disabledTS: Long? = null
)

data class PatternInsightState(
    val shownInsightIdsByDate: Map<String, List<String>>
)

data class SyncData(
    val cfg: UserCfg,
    val answers: List<Answer>,
    val lastBlockedTS: Long,
    val lastBlockedUrl: String,
    val moodCheckTS: Long,
    val moodCheckVal: String?, // MoodCheckinVal is not a known type in Kotlin, so I'm using String
    val moodCheckAdditional: String,
    val energyLvlTS: Long,
    val energyLvlVal: Int,
    val sunTaps: Map<String, Int>,
    val attempts: Map<String, Int>,
    val lastBrowsingBehaviorRatingTS: Long,
    val browsingBehaviorRating: Map<String, Int>,
    val dailyQuestionsMorningTS: Long,
    val dailyQuestionsEveningTS: Long,
    val lastAppUsageRatingTS: Long,
    val appUsageRating: Map<String, Int>,
    val selfAssessment: Map<String, Map<String, Any>>,
    val alternativeApps: List<String>,
    val alternativeWebsites: List<String>,
    val emotionLabeling: Map<String, Any>?,
    val budgetPromptDismissedTS: Long,
    val activeTimer: ActiveTimer?,
    val dailyBudget: DailyBudget?,
    val dailyUsage: Map<String, DailyUsage>,
    val sleepWindDownDismissedNightId: String,
    val sleepWindDownSnoozeUntilTS: Long,
    val sleepWindDownProgressNightId: String,
    val sleepWindDownCompleted: List<String>,
    val sleepWindDownBrainDumpDraft: String,
    val sleepWindDownGratitudeDraft: String = "",
    val sleepWindDownTomorrowDraft: String = "",
    val alternatives: List<Alternative> = emptyList(),
    val patternInsightState: PatternInsightState = PatternInsightState(emptyMap())
)

fun parseSyncData(jsonString: String): SyncData {
    val jsonObject = JSONObject(jsonString)
    return parseSyncDataFromJSONObject(jsonObject)
}

fun parseSyncDataFromJSONObject(jsonObject: JSONObject): SyncData {
    val cfg = jsonObject.getJSONObject("cfg")
    val isOnboardingComplete = cfg.getBoolean("isOnboardingComplete")
    val blockedHosts = cfg.getJSONArray("blockedHosts").let { array ->
        List(array.length()) { array.getString(it) }
    }
    val blockedApps = cfg.getJSONArray("blockedApps").let { array ->
        List(array.length()) { array.getString(it) }
    }
    val focusSchedule = cfg.optJSONObject("focusSchedule")?.let { jsonObjectToMap(it) }
    val soundEnabled = if (cfg.has("soundEnabled")) cfg.getBoolean("soundEnabled") else null
    val sleepWindDown = cfg.optJSONObject("sleepWindDown")?.let { jsonObjectToMap(it) }
    // Session Grace is on by default (5 min), matching the extension's
    // DEFAULT_SYNC_DATA. Existing installs have JSON predating this setting, so
    // when "sessionGrace" is absent the native overlay must still see grace
    // enabled — otherwise interventions would fire immediately after the budget
    // removal (#38), the very nagging this default exists to prevent. An explicit
    // (possibly disabled) value the user set is always honoured.
    val sessionGrace = cfg.optJSONObject("sessionGrace")?.let { graceObj ->
        SessionGraceCfg(
            enabled = graceObj.optBoolean("enabled", false),
            minutes = graceObj.optInt("minutes", 0)
        )
    } ?: SessionGraceCfg(enabled = true, minutes = 5)
    val userCfg = UserCfg(isOnboardingComplete, blockedHosts, blockedApps, focusSchedule, soundEnabled, sleepWindDown, sessionGrace)

    val answers = jsonObject.getJSONArray("answers").let { array ->
        List(array.length()) { i ->
            val answerObject = array.getJSONObject(i)
            val id = answerObject.optString("id", "")
            val qid = answerObject.optString("qid", null)
            val questionCategoryId = answerObject.optString("questionCategoryId", "")
            val `val` = answerObject.get("val")
            val ts = answerObject.optLong("ts", 0L)
            Answer(id, qid, questionCategoryId, `val`, ts)
        }
    }

    val lastBlockedTS = jsonObject.optLong("lastBlockedTS", DEFAULT_TS_VAL)
    val lastBlockedUrl = jsonObject.optString("lastBlockedUrl", "")
    val moodCheckTS = jsonObject.optLong("moodCheckTS", DEFAULT_TS_VAL)
    val moodCheckVal = jsonObject.optString("moodCheckVal", null)
    val moodCheckAdditional = jsonObject.optString("moodCheckAdditional", "")
    val energyLvlTS = jsonObject.optLong("energyLvlTS", DEFAULT_TS_VAL)
    val energyLvlVal = jsonObject.optInt("energyLvlVal", 0)

    val sunTaps = jsonObject.getJSONObject("sunTaps").let { sunTapsObject ->
        sunTapsObject.keys().asSequence().associateWith { sunTapsObject.getInt(it) }
    }

    val attempts = jsonObject.getJSONObject("attempts").let { attemptsObject ->
        attemptsObject.keys().asSequence().associateWith { attemptsObject.getInt(it) }
    }

    val lastBrowsingBehaviorRatingTS = jsonObject.optLong("lastBrowsingBehaviorRatingTS", DEFAULT_TS_VAL)

    val browsingBehaviorRating =
        jsonObject.optJSONObject("browsingBehaviorRating")?.let { ratingObject ->
            ratingObject.keys().asSequence().associateWith { ratingObject.getInt(it) }
        } ?: emptyMap()

    val dailyQuestionsMorningTS = jsonObject.optLong("dailyQuestionsMorningTS", 99L)
    val dailyQuestionsEveningTS = jsonObject.optLong("dailyQuestionsEveningTS", 99L)
    val lastAppUsageRatingTS = jsonObject.optLong("lastAppUsageRatingTS", 99L)

    val appUsageRating = jsonObject.optJSONObject("appUsageRating")?.let { obj ->
        obj.keys().asSequence().associateWith { obj.getInt(it) }
    } ?: emptyMap()

    val selfAssessment = jsonObject.optJSONObject("selfAssessment")?.let { obj ->
        val result = mutableMapOf<String, Map<String, Any>>()
        obj.keys().forEach { key ->
            obj.optJSONObject(key)?.let { entry ->
                result[key] = mapOf<String, Any>("ts" to entry.optLong("ts", DEFAULT_TS_VAL), "val" to entry.optInt("val", -1))
            }
        }
        result.toMap()
    } ?: emptyMap()

    val alternativeApps = jsonObject.optJSONArray("alternativeApps")?.let { arr ->
        List(arr.length()) { arr.getString(it) }
    } ?: emptyList()

    val alternativeWebsites = jsonObject.optJSONArray("alternativeWebsites")?.let { arr ->
        List(arr.length()) { arr.getString(it) }
    } ?: emptyList()

    val alternatives = jsonObject.optJSONArray("alternatives")?.let { arr ->
        val result = mutableListOf<Alternative>()
        for (i in 0 until arr.length()) {
            val alternativeObj = arr.optJSONObject(i) ?: continue
            val id = alternativeObj.optString("id", "")
            val kind = alternativeObj.optString("kind", "")
            val label = alternativeObj.optString("label", "")
            if (id.isBlank() || kind.isBlank() || label.isBlank()) {
                continue
            }

            val url = alternativeObj.optString("url", "").takeIf { it.isNotBlank() }
            val packageName = alternativeObj.optString("packageName", "").takeIf { it.isNotBlank() }
            val lastShownTS = if (alternativeObj.has("lastShownTS") && !alternativeObj.isNull("lastShownTS")) {
                alternativeObj.optLong("lastShownTS")
            } else {
                null
            }
            val disabledTS = if (alternativeObj.has("disabledTS") && !alternativeObj.isNull("disabledTS")) {
                alternativeObj.optLong("disabledTS")
            } else {
                null
            }

            result.add(
                Alternative(
                    id = id,
                    kind = kind,
                    label = label,
                    url = url,
                    packageName = packageName,
                    createdTS = alternativeObj.optLong("createdTS", 0L),
                    lastShownTS = lastShownTS,
                    shownCount = alternativeObj.optInt("shownCount", 0),
                    dismissedCount = alternativeObj.optInt("dismissedCount", 0),
                    openedCount = alternativeObj.optInt("openedCount", 0),
                    disabledTS = disabledTS
                )
            )
        }
        result
    } ?: emptyList()

    val emotionLabeling = jsonObject.optJSONObject("emotionLabeling")?.let { obj ->
        val ts = obj.optLong("ts", 99L)
        val emotions = obj.optJSONArray("emotions")?.let { arr ->
            List(arr.length()) { arr.getString(it) }
        } ?: emptyList()
        val bodyLocations = obj.optJSONArray("bodyLocations")?.let { arr ->
            List(arr.length()) { arr.getString(it) }
        } ?: emptyList()
        mapOf<String, Any>("ts" to ts, "emotions" to emotions, "bodyLocations" to bodyLocations)
    }

    val patternInsightState = jsonObject.optJSONObject("patternInsightState")?.let { stateObj ->
        val shownObj = stateObj.optJSONObject("shownInsightIdsByDate")
        val shownByDate = shownObj?.let { obj ->
            obj.keys().asSequence().associateWith { dateKey ->
                val ids = obj.optJSONArray(dateKey)
                if (ids == null) {
                    emptyList()
                } else {
                    List(ids.length()) { ids.getString(it) }
                }
            }
        } ?: emptyMap()
        PatternInsightState(shownByDate)
    } ?: PatternInsightState(emptyMap())

    val budgetPromptDismissedTS = jsonObject.optLong("budgetPromptDismissedTS", 99L)

    val activeTimer = jsonObject.optJSONObject("activeTimer")?.let { timerObj ->
        val startedTS = if (timerObj.has("startedTS") && !timerObj.isNull("startedTS")) {
            timerObj.optLong("startedTS")
        } else {
            null
        }
        val target = timerObj.optJSONObject("target")?.let { targetObj ->
            val kind = targetObj.optString("kind", "")
            val id = targetObj.optString("id", "")
            if (kind.isNotBlank() && id.isNotBlank()) SessionTarget(kind, id) else null
        }
        val platform = timerObj.optString("platform", "").takeIf { it.isNotBlank() }
        val intent = timerObj.optJSONObject("intent")?.let { intentObj ->
            intentObj.optString("id", "").takeIf { it.isNotBlank() }?.let { SessionIntent(it) }
        }

        ActiveTimer(
            timerObj.optLong("endTS", 0L),
            timerObj.optInt("durationS", 0),
            startedTS,
            target,
            platform,
            intent
        )
    }

    val dailyBudget = jsonObject.optJSONObject("dailyBudget")?.let { budgetObj ->
        val globalMinutes = budgetObj.optInt("globalMinutes", 0)
        val perSiteMinutes = budgetObj.optJSONObject("perSiteMinutes")?.let { perSiteObj ->
            perSiteObj.keys().asSequence().associateWith { perSiteObj.getInt(it) }
        }
        DailyBudget(globalMinutes, perSiteMinutes)
    }

    val dailyUsage = jsonObject.optJSONObject("dailyUsage")?.let { usageObj ->
        usageObj.keys().asSequence().associateWith { dateKey ->
            val dayObj = usageObj.getJSONObject(dateKey)
            val totalSeconds = dayObj.getInt("totalSeconds")
            val perSite = dayObj.optJSONObject("perSite")?.let { perSiteObj ->
                perSiteObj.keys().asSequence().associateWith { perSiteObj.getInt(it) }
            } ?: emptyMap()
            DailyUsage(totalSeconds, perSite)
        }
    } ?: emptyMap()

    val sleepWindDownDismissedNightId = jsonObject.optString("sleepWindDownDismissedNightId", "")
    val sleepWindDownSnoozeUntilTS = jsonObject.optLong("sleepWindDownSnoozeUntilTS", 0L)
    val sleepWindDownProgressNightId = jsonObject.optString("sleepWindDownProgressNightId", "")
    val sleepWindDownCompleted = jsonObject.optJSONArray("sleepWindDownCompleted")?.let { arr ->
        List(arr.length()) { arr.getString(it) }
    } ?: emptyList()
    val sleepWindDownBrainDumpDraft = jsonObject.optString("sleepWindDownBrainDumpDraft", "")
    val sleepWindDownGratitudeDraft = jsonObject.optString("sleepWindDownGratitudeDraft", "")
    val sleepWindDownTomorrowDraft = jsonObject.optString("sleepWindDownTomorrowDraft", "")

    return SyncData(
        userCfg,
        answers,
        lastBlockedTS,
        lastBlockedUrl,
        moodCheckTS,
        moodCheckVal,
        moodCheckAdditional,
        energyLvlTS,
        energyLvlVal,
        sunTaps,
        attempts,
        lastBrowsingBehaviorRatingTS,
        browsingBehaviorRating,
        dailyQuestionsMorningTS,
        dailyQuestionsEveningTS,
        lastAppUsageRatingTS,
        appUsageRating,
        selfAssessment,
        alternativeApps,
        alternativeWebsites,
        emotionLabeling,
        budgetPromptDismissedTS,
        activeTimer,
        dailyBudget,
        dailyUsage,
        sleepWindDownDismissedNightId,
        sleepWindDownSnoozeUntilTS,
        sleepWindDownProgressNightId,
        sleepWindDownCompleted,
        sleepWindDownBrainDumpDraft,
        sleepWindDownGratitudeDraft,
        sleepWindDownTomorrowDraft,
        alternatives,
        patternInsightState
    )
}

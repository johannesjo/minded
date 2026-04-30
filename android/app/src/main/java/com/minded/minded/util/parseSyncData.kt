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
    val sleepWindDown: Map<String, Any?>?
)

data class Answer(
    val id: String,
    val qid: String?, // QID is not a known type in Kotlin, so I'm using String
    val questionCategoryId: String, // QuestionCategoryId is not a known type in Kotlin, so I'm using String
    val `val`: Any, // val can be String or Number in TypeScript, so I'm using Any in Kotlin
    val ts: Long
)

data class ActiveTimer(
    val endTS: Long,
    val durationS: Int
)

data class DailyBudget(
    val globalMinutes: Int,
    val perSiteMinutes: Map<String, Int>?
)

data class DailyUsage(
    val totalSeconds: Int,
    val perSite: Map<String, Int>
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
    val sleepWindDownSnoozeUntilTS: Long
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
    val userCfg = UserCfg(isOnboardingComplete, blockedHosts, blockedApps, focusSchedule, soundEnabled, sleepWindDown)

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

    val budgetPromptDismissedTS = jsonObject.optLong("budgetPromptDismissedTS", 99L)

    val activeTimer = jsonObject.optJSONObject("activeTimer")?.let { timerObj ->
        ActiveTimer(
            timerObj.optLong("endTS", 0L),
            timerObj.optInt("durationS", 0)
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
        sleepWindDownSnoozeUntilTS
    )
}

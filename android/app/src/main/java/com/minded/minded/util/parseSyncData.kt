package com.minded.minded.util

import org.json.JSONObject


data class UserCfg(
    val isOnboardingComplete: Boolean,
    val blockedHosts: List<String>,
    val blockedApps: List<String>
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
    val activeTimer: ActiveTimer?,
    val dailyBudget: DailyBudget?,
    val dailyUsage: Map<String, DailyUsage>
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
    val userCfg = UserCfg(isOnboardingComplete, blockedHosts, blockedApps)

    val answers = jsonObject.getJSONArray("answers").let { array ->
        List(array.length()) { i ->
            val answerObject = array.getJSONObject(i)
            val id = answerObject.getString("id")
            val qid = answerObject.optString("qid", null)
            val questionCategoryId = answerObject.getString("questionCategoryId")
            val `val` = answerObject.get("val")
            val ts = answerObject.getLong("ts")
            Answer(id, qid, questionCategoryId, `val`, ts)
        }
    }

    val lastBlockedTS = jsonObject.getLong("lastBlockedTS")
    val lastBlockedUrl = jsonObject.getString("lastBlockedUrl")
    val moodCheckTS = jsonObject.getLong("moodCheckTS")
    val moodCheckVal = jsonObject.optString("moodCheckVal", null)
    val moodCheckAdditional = jsonObject.getString("moodCheckAdditional")
    val energyLvlTS = jsonObject.getLong("energyLvlTS")
    val energyLvlVal = jsonObject.getInt("energyLvlVal")

    val sunTaps = jsonObject.getJSONObject("sunTaps").let { sunTapsObject ->
        sunTapsObject.keys().asSequence().associateWith { sunTapsObject.getInt(it) }
    }

    val attempts = jsonObject.getJSONObject("attempts").let { attemptsObject ->
        attemptsObject.keys().asSequence().associateWith { attemptsObject.getInt(it) }
    }

    val lastBrowsingBehaviorRatingTS = jsonObject.getLong("lastBrowsingBehaviorRatingTS")

    val browsingBehaviorRating =
        jsonObject.getJSONObject("browsingBehaviorRating").let { ratingObject ->
            ratingObject.keys().asSequence().associateWith { ratingObject.getInt(it) }
        }

    val activeTimer = jsonObject.optJSONObject("activeTimer")?.let { timerObj ->
        ActiveTimer(
            timerObj.getLong("endTS"),
            timerObj.getInt("durationS")
        )
    }

    val dailyBudget = jsonObject.optJSONObject("dailyBudget")?.let { budgetObj ->
        val globalMinutes = budgetObj.getInt("globalMinutes")
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
        activeTimer,
        dailyBudget,
        dailyUsage
    )
}

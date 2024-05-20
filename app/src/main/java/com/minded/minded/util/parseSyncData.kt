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
    val blocked: Map<String, Int>,
    val attempts: Map<String, Int>,
    val lastBrowsingBehaviorRatingTS: Long,
    val browsingBehaviorRating: Map<String, Int>
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

    val blocked = jsonObject.getJSONObject("blocked").let { blockedObject ->
        blockedObject.keys().asSequence().associateWith { blockedObject.getInt(it) }
    }

    val attempts = jsonObject.getJSONObject("attempts").let { attemptsObject ->
        attemptsObject.keys().asSequence().associateWith { attemptsObject.getInt(it) }
    }

    val lastBrowsingBehaviorRatingTS = jsonObject.getLong("lastBrowsingBehaviorRatingTS")

    val browsingBehaviorRating =
        jsonObject.getJSONObject("browsingBehaviorRating").let { ratingObject ->
            ratingObject.keys().asSequence().associateWith { ratingObject.getInt(it) }
        }

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
        blocked,
        attempts,
        lastBrowsingBehaviorRatingTS,
        browsingBehaviorRating
    )
}

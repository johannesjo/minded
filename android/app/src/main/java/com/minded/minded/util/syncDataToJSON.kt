package com.minded.minded.util

import org.json.JSONArray
import org.json.JSONObject

fun syncDataToJson(syncData: SyncData): String {
    val jsonObject = JSONObject()

    val cfgObject = JSONObject()
    cfgObject.put("isOnboardingComplete", syncData.cfg.isOnboardingComplete)
    cfgObject.put("blockedHosts", JSONArray(syncData.cfg.blockedHosts))
    cfgObject.put("blockedApps", JSONArray(syncData.cfg.blockedApps))
    jsonObject.put("cfg", cfgObject)

    val answersArray = JSONArray()
    syncData.answers.forEach { answer ->
        val answerObject = JSONObject()
        answerObject.put("id", answer.id)
        answerObject.put("qid", answer.qid)
        answerObject.put("questionCategoryId", answer.questionCategoryId)
        answerObject.put("val", answer.`val`)
        answerObject.put("ts", answer.ts)
        answersArray.put(answerObject)
    }
    jsonObject.put("answers", answersArray)

    jsonObject.put("lastBlockedTS", syncData.lastBlockedTS)
    jsonObject.put("lastBlockedUrl", syncData.lastBlockedUrl)
    jsonObject.put("moodCheckTS", syncData.moodCheckTS)
    jsonObject.put("moodCheckVal", syncData.moodCheckVal)
    jsonObject.put("moodCheckAdditional", syncData.moodCheckAdditional)
    jsonObject.put("energyLvlTS", syncData.energyLvlTS)
    jsonObject.put("energyLvlVal", syncData.energyLvlVal)

    val sunTapsObject = JSONObject()
    syncData.sunTaps.forEach { (key, value) ->
        sunTapsObject.put(key, value)
    }
    jsonObject.put("sunTaps", sunTapsObject)

    val attemptsObject = JSONObject()
    syncData.attempts.forEach { (key, value) ->
        attemptsObject.put(key, value)
    }
    jsonObject.put("attempts", attemptsObject)

    jsonObject.put("lastBrowsingBehaviorRatingTS", syncData.lastBrowsingBehaviorRatingTS)

    val browsingBehaviorRatingObject = JSONObject()
    syncData.browsingBehaviorRating.forEach { (key, value) ->
        browsingBehaviorRatingObject.put(key, value)
    }
    jsonObject.put("browsingBehaviorRating", browsingBehaviorRatingObject)

    if (syncData.activeTimer != null) {
        val timerObj = JSONObject()
        timerObj.put("endTS", syncData.activeTimer.endTS)
        timerObj.put("durationS", syncData.activeTimer.durationS)
        jsonObject.put("activeTimer", timerObj)
    }

    return jsonObject.toString()
}

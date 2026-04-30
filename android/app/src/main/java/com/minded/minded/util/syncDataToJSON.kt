package com.minded.minded.util

import org.json.JSONArray
import org.json.JSONObject

fun syncDataToJson(syncData: SyncData): String {
    val jsonObject = JSONObject()

    val cfgObject = JSONObject()
    cfgObject.put("isOnboardingComplete", syncData.cfg.isOnboardingComplete)
    cfgObject.put("blockedHosts", JSONArray(syncData.cfg.blockedHosts))
    cfgObject.put("blockedApps", JSONArray(syncData.cfg.blockedApps))
    syncData.cfg.focusSchedule?.let { schedule ->
        cfgObject.put("focusSchedule", JSONObject(schedule))
    }
    syncData.cfg.soundEnabled?.let { cfgObject.put("soundEnabled", it) }
    syncData.cfg.sleepWindDown?.let { cfgObject.put("sleepWindDown", JSONObject(it)) }
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

    jsonObject.put("dailyQuestionsMorningTS", syncData.dailyQuestionsMorningTS)
    jsonObject.put("dailyQuestionsEveningTS", syncData.dailyQuestionsEveningTS)
    jsonObject.put("lastAppUsageRatingTS", syncData.lastAppUsageRatingTS)

    val appUsageRatingObj = JSONObject()
    syncData.appUsageRating.forEach { (key, value) -> appUsageRatingObj.put(key, value) }
    jsonObject.put("appUsageRating", appUsageRatingObj)

    val selfAssessmentObj = JSONObject()
    syncData.selfAssessment.forEach { (key, value) ->
        val entryObj = JSONObject()
        entryObj.put("ts", value["ts"])
        entryObj.put("val", value["val"])
        selfAssessmentObj.put(key, entryObj)
    }
    jsonObject.put("selfAssessment", selfAssessmentObj)

    jsonObject.put("alternativeApps", JSONArray(syncData.alternativeApps))
    jsonObject.put("alternativeWebsites", JSONArray(syncData.alternativeWebsites))

    if (syncData.emotionLabeling != null) {
        val elObj = JSONObject()
        elObj.put("ts", syncData.emotionLabeling["ts"])
        elObj.put("emotions", JSONArray(syncData.emotionLabeling["emotions"] as? List<*> ?: emptyList<String>()))
        elObj.put("bodyLocations", JSONArray(syncData.emotionLabeling["bodyLocations"] as? List<*> ?: emptyList<String>()))
        jsonObject.put("emotionLabeling", elObj)
    }

    jsonObject.put("budgetPromptDismissedTS", syncData.budgetPromptDismissedTS)

    if (syncData.activeTimer != null) {
        val timerObj = JSONObject()
        timerObj.put("endTS", syncData.activeTimer.endTS)
        timerObj.put("durationS", syncData.activeTimer.durationS)
        jsonObject.put("activeTimer", timerObj)
    }

    if (syncData.dailyBudget != null) {
        val budgetObj = JSONObject()
        budgetObj.put("globalMinutes", syncData.dailyBudget.globalMinutes)
        if (syncData.dailyBudget.perSiteMinutes != null) {
            val perSiteObj = JSONObject()
            syncData.dailyBudget.perSiteMinutes.forEach { (key, value) ->
                perSiteObj.put(key, value)
            }
            budgetObj.put("perSiteMinutes", perSiteObj)
        }
        jsonObject.put("dailyBudget", budgetObj)
    }

    val dailyUsageObj = JSONObject()
    syncData.dailyUsage.forEach { (dateKey, usage) ->
        val usageObj = JSONObject()
        usageObj.put("totalSeconds", usage.totalSeconds)
        val perSiteObj = JSONObject()
        usage.perSite.forEach { (host, seconds) ->
            perSiteObj.put(host, seconds)
        }
        usageObj.put("perSite", perSiteObj)
        dailyUsageObj.put(dateKey, usageObj)
    }
    jsonObject.put("dailyUsage", dailyUsageObj)

    jsonObject.put("sleepWindDownDismissedNightId", syncData.sleepWindDownDismissedNightId)
    jsonObject.put("sleepWindDownSnoozeUntilTS", syncData.sleepWindDownSnoozeUntilTS)
    jsonObject.put("sleepWindDownProgressNightId", syncData.sleepWindDownProgressNightId)
    jsonObject.put("sleepWindDownCompleted", JSONArray(syncData.sleepWindDownCompleted))
    jsonObject.put("sleepWindDownBrainDumpDraft", syncData.sleepWindDownBrainDumpDraft)

    return jsonObject.toString()
}

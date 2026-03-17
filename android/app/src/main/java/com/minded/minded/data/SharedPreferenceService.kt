package com.minded.minded.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.minded.minded.data.defaultSyncData
import com.minded.minded.util.DailyUsage
import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg
import com.minded.minded.util.getIsoDate
import com.minded.minded.util.parseSyncData
import com.minded.minded.util.syncDataToJson

class SharedPreferenceService(context: Context) {
    private val logTag = "SharedPreferenceService"
    private val DB_KEY = "mindedAll"
    private val DB_NAME = "mindedData"
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(DB_NAME, Context.MODE_PRIVATE)

    fun writeDefaultDataIfNecessary() {
        val hasNoData = hasNoData();
        Log.v(logTag, "writeDefaultDataIfNecessary() $hasNoData")
        if (hasNoData) {
            Log.v(logTag, "writeDefaultDataIfNecessary(): No data found, saving default data")
            saveSyncData(defaultSyncData)
        }
    }

    fun saveDataString(value: String) {
        with(sharedPreferences.edit()) {
            putString(DB_KEY, value)
            apply()
        }
    }

    fun retrieveDataString(): String? {
        return sharedPreferences.getString(DB_KEY, null)
    }

    fun hasNoData(): Boolean {
        val res = retrieveDataString();
        Log.v(logTag, "hasNoData() $res")
        return res == null || res == "{}"
    }

    fun getSyncData(): SyncData {
        return try {
            val allStr = retrieveDataString()
            Log.v(logTag, "getSyncData() allStr $allStr ")
            parseSyncData(allStr!!)
        } catch (e: Exception) {
            // Log the exception if necessary
            Log.e(logTag, "Error getting sync data", e)
            defaultSyncData
        }
    }

    fun saveSyncData(syncData: SyncData) {
        saveDataString(syncDataToJson(syncData))
    }

    fun updateSyncData(update: SyncData.() -> SyncData) {
        val syncData = getSyncData()
        val updatedSyncData = syncData.update()
        saveSyncData(updatedSyncData)
    }

    fun updateSyncDataCfg(update: UserCfg.() -> Unit) {
        val syncData = getSyncData()
        syncData.apply {
            cfg.update()
        }
        saveSyncData(syncData)

    }

    fun getBlockedApps(): List<String> {
        val syncData = getSyncData()
        Log.v(logTag, "getBlockedApps() syncData.cfg.blockedApps: ${syncData.cfg.blockedApps}")
        return syncData.cfg.blockedApps
    }

    fun countUserDrivenClose() {
        val syncData = getSyncData()
        val isoDateToday = getIsoDate()

        val updatedSunTaps = syncData.sunTaps.toMutableMap().apply {
            this[isoDateToday] = this.getOrDefault(isoDateToday, 0) + 1
        }
        Log.v(logTag, "countUserDrivenClose() updatedSunTaps: $updatedSunTaps")
        Log.v(logTag, "countUserDrivenClose() isoDateToday: $isoDateToday")
        Log.v(logTag, "countUserDrivenClose() syncData: $syncData")
        val updatedSyncData = syncData.copy(sunTaps = updatedSunTaps)
        saveSyncData(updatedSyncData)
    }

    fun addBudgetUsage(secondsToAdd: Int) {
        val today = getIsoDate()
        updateSyncData {
            val currentUsage = dailyUsage[today] ?: DailyUsage(totalSeconds = 0, perSite = emptyMap())
            copy(dailyUsage = dailyUsage + (today to currentUsage.copy(totalSeconds = currentUsage.totalSeconds + secondsToAdd)))
        }
    }

    // TODO
    fun countAppUsageAttempt() {
        val syncData = getSyncData()
        val isoDateToday = getIsoDate()

        val updatedAttempts = syncData.attempts.toMutableMap().apply {
            this[isoDateToday] = this.getOrDefault(isoDateToday, 0) + 1
        }
        Log.v(logTag, "countAttempt() updatedAttempts: $updatedAttempts")
        Log.v(logTag, "countAttempt() isoDateToday: $isoDateToday")
        Log.v(logTag, "countAttempt() syncData: $syncData")
        val updatedSyncData = syncData.copy(attempts = updatedAttempts)
        saveSyncData(updatedSyncData)
    }
}

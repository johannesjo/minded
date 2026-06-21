package com.minded.minded.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.minded.minded.BuildConfig
import com.minded.minded.data.defaultSyncData
import com.minded.minded.util.SyncData
import com.minded.minded.util.UserCfg
import com.minded.minded.util.getIsoDate
import com.minded.minded.util.parseSyncData
import com.minded.minded.util.syncDataToJson

class SharedPreferenceService(context: Context) {
    private val logTag = "SharedPreferenceService"
    private val DB_KEY = "mindedAll"
    private val DB_NAME = "mindedData"
    private val LITTLE_SUN_POS_X_KEY = "littleSunPosX"
    private val LITTLE_SUN_POS_Y_KEY = "littleSunPosY"
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

    @Synchronized
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
        if (BuildConfig.DEBUG) Log.v(logTag, "hasNoData() $res")
        return res == null || res == "{}"
    }

    @Synchronized
    fun getSyncData(): SyncData {
        return try {
            val allStr = retrieveDataString()
            if (BuildConfig.DEBUG) Log.v(logTag, "getSyncData() allStr $allStr ")
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

    @Synchronized
    fun updateSyncData(update: SyncData.() -> SyncData) {
        val syncData = getSyncData()
        val updatedSyncData = syncData.update()
        saveSyncData(updatedSyncData)
    }

    @Synchronized
    fun updateSyncDataCfg(update: UserCfg.() -> UserCfg) {
        val syncData = getSyncData()
        val updatedCfg = syncData.cfg.update()
        saveSyncData(syncData.copy(cfg = updatedCfg))
    }

    /**
     * Where the user parked the draggable little-sun bubble, so it reappears in
     * the same spot. Stored outside the JSON sync blob — it is a purely local,
     * per-device UI preference with no place in synced data.
     */
    fun saveLittleSunPosition(x: Int, y: Int) {
        with(sharedPreferences.edit()) {
            putInt(LITTLE_SUN_POS_X_KEY, x)
            putInt(LITTLE_SUN_POS_Y_KEY, y)
            apply()
        }
    }

    fun getLittleSunPosition(): Pair<Int, Int>? {
        if (!sharedPreferences.contains(LITTLE_SUN_POS_X_KEY)) return null
        return sharedPreferences.getInt(LITTLE_SUN_POS_X_KEY, 0) to
            sharedPreferences.getInt(LITTLE_SUN_POS_Y_KEY, 0)
    }

    fun getBlockedApps(): List<String> {
        val syncData = getSyncData()
        if (BuildConfig.DEBUG) Log.v(logTag, "getBlockedApps() syncData.cfg.blockedApps: ${syncData.cfg.blockedApps}")
        return syncData.cfg.blockedApps
    }

    fun countUserDrivenClose() {
        val isoDateToday = getIsoDate()
        updateSyncData {
            val updatedSunTaps = sunTaps.toMutableMap().apply {
                this[isoDateToday] = this.getOrDefault(isoDateToday, 0) + 1
            }
            if (BuildConfig.DEBUG) {
                Log.v(logTag, "countUserDrivenClose() updatedSunTaps: $updatedSunTaps")
            }
            copy(sunTaps = updatedSunTaps)
        }
    }

    fun countAppUsageAttempt() {
        val isoDateToday = getIsoDate()
        updateSyncData {
            val updatedAttempts = attempts.toMutableMap().apply {
                this[isoDateToday] = this.getOrDefault(isoDateToday, 0) + 1
            }
            if (BuildConfig.DEBUG) {
                Log.v(logTag, "countAppUsageAttempt() updatedAttempts: $updatedAttempts")
            }
            copy(attempts = updatedAttempts)
        }
    }
}

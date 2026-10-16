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
import com.minded.minded.sleepwinddown.SleepWindDownWindow
import com.minded.minded.util.skipStreakAfterSkip
import com.minded.minded.util.syncDataToJson

class SharedPreferenceService(context: Context) {
    private val logTag = "SharedPreferenceService"
    private val DB_KEY = "mindedAll"
    private val DB_NAME = "mindedData"
    private val LITTLE_SUN_POS_X_KEY = "littleSunPosX"
    private val LITTLE_SUN_POS_Y_KEY = "littleSunPosY"
    private val BELL_SALT_KEY = "mindfulnessBellSalt"
    private val BELL_DAY_KEY = "mindfulnessBellDay"
    private val BELL_RUNG_MASK_KEY = "mindfulnessBellRungMask"
    private val BELL_LAST_RUNG_MINUTE_KEY = "mindfulnessBellLastRungMinute"
    private val BELL_LAST_CHECK_KEY = "mindfulnessBellLastCheck"
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
     * the same spot. Stored outside the JSON sync blob - it is a purely local,
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

    /**
     * Per-install salt for the mindfulness bell's daily slot draw
     * (MindfulnessBellSchedule.slotsFor), created once. Local only, like the
     * bubble position: it is scheduling bookkeeping, not user data.
     */
    @Synchronized
    fun getMindfulnessBellSalt(): Long {
        if (sharedPreferences.contains(BELL_SALT_KEY)) {
            return sharedPreferences.getLong(BELL_SALT_KEY, 0L)
        }
        val salt = kotlin.random.Random.nextLong()
        sharedPreferences.edit().putLong(BELL_SALT_KEY, salt).apply()
        return salt
    }

    /**
     * Which of today's bell slots have rung (bit mask) and the minute of the
     * last ring - only so a slot never rings twice. Read for another day it is
     * empty: yesterday's bookkeeping is simply forgotten, never tallied.
     */
    @Synchronized
    fun getMindfulnessBellDay(epochDay: Long): Pair<Int, Int?> {
        if (sharedPreferences.getLong(BELL_DAY_KEY, -1L) != epochDay) return 0 to null
        val mask = sharedPreferences.getInt(BELL_RUNG_MASK_KEY, 0)
        val last = sharedPreferences.getInt(BELL_LAST_RUNG_MINUTE_KEY, -1)
        return mask to last.takeIf { it >= 0 }
    }

    @Synchronized
    fun markMindfulnessBellRung(epochDay: Long, slot: Int, minuteOfDay: Int) {
        val (mask, _) = getMindfulnessBellDay(epochDay)
        with(sharedPreferences.edit()) {
            putLong(BELL_DAY_KEY, epochDay)
            putInt(BELL_RUNG_MASK_KEY, mask or (1 shl slot))
            putInt(BELL_LAST_RUNG_MINUTE_KEY, minuteOfDay)
            apply()
        }
    }

    /**
     * The last time a bell was due and what came of it - rang, or the reason it
     * stayed quiet - as JSON `{"atMs":…,"rang":…,"reason":…}`. Only so the
     * settings can show why a bell hasn't been heard; overwritten each time,
     * never a history. Local only, like the rest of the bell's bookkeeping.
     */
    fun setMindfulnessBellLastCheck(json: String) {
        sharedPreferences.edit().putString(BELL_LAST_CHECK_KEY, json).apply()
    }

    fun getMindfulnessBellLastCheck(): String? =
        sharedPreferences.getString(BELL_LAST_CHECK_KEY, null)

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

    /**
     * The user went straight past an intervention natively (the tap on the
     * loading sun), so the WebView never saw it. Counts toward the skip
     * check-in exactly like the web-side countInterventionSkip.
     */
    fun countInterventionSkip() {
        val now = System.currentTimeMillis()
        val syncData = getSyncData()
        val next = skipStreakAfterSkip(
            syncData.skipStreak,
            syncData.lastSkipTS,
            syncData.interventionPause,
            now,
            isBedtime = SleepWindDownWindow.resolveNightId(syncData.cfg, now) != null,
        ) ?: return
        updateSyncData { copy(skipStreak = next, lastSkipTS = now) }
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

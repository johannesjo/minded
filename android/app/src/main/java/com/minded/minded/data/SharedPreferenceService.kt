package com.minded.minded.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.minded.minded.BuildConfig
import com.minded.minded.data.defaultSyncData
import com.minded.minded.util.MindfulnessBellSchedule
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
    private val BELL_LAST_UNLOCK_KEY = "mindfulnessBellLastUnlock"
    private val BELL_TRACE_KEY = "mindfulnessBellTrace"
    private val BELL_TEST_ARMED_KEY = "mindfulnessBellTestArmed"
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
     * last ring - only so a slot never rings twice, nor two rings close
     * together. The last ring is in minutes of [epochDay]: negative when it
     * was yesterday, so the ring gap holds across midnight. Older bookkeeping
     * is simply forgotten, never tallied.
     */
    @Synchronized
    fun getMindfulnessBellDay(epochDay: Long): Pair<Int, Int?> {
        val day = sharedPreferences.getLong(BELL_DAY_KEY, -1L)
        val last = sharedPreferences.getInt(BELL_LAST_RUNG_MINUTE_KEY, -1)
            .takeIf { it >= 0 && day >= 0 }
            ?.let { (day - epochDay).toInt() * MindfulnessBellSchedule.DAY_MINUTES + it }
        return when (day) {
            epochDay -> sharedPreferences.getInt(BELL_RUNG_MASK_KEY, 0) to last
            epochDay - 1 -> 0 to last
            else -> 0 to null
        }
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
     * stayed quiet - as JSON `{"atMs":…,"rang":…,"reason":…,"through":…}`
     * (through: the sun it rang through, if one was already there). Only so the
     * settings can show why a bell hasn't been heard; overwritten each time,
     * never a history. Local only, like the rest of the bell's bookkeeping.
     */
    fun setMindfulnessBellLastCheck(json: String) {
        sharedPreferences.edit().putString(BELL_LAST_CHECK_KEY, json).apply()
    }

    fun getMindfulnessBellLastCheck(): String? =
        sharedPreferences.getString(BELL_LAST_CHECK_KEY, null)

    /**
     * The last unlock the bell saw, due or not, as JSON
     * `{"atMs":…,"enabled":…,"nextAtMs":…}` (nextAtMs: when today's next bell
     * window opens, null if none is left). Lets the settings tell "no unlock
     * reached the bell" from "none fell in a bell's window". Overwritten each
     * unlock, never a history.
     */
    fun setMindfulnessBellLastUnlock(json: String) {
        sharedPreferences.edit().putString(BELL_LAST_UNLOCK_KEY, json).apply()
    }

    fun getMindfulnessBellLastUnlock(): String? =
        sharedPreferences.getString(BELL_LAST_UNLOCK_KEY, null)

    /**
     * TEMPORARY diagnostic: when each step of an unlock's way to the bell last
     * ran, as JSON `{"<stage>":atMs,…,"error":"…"}`, so a bell that never hears
     * an unlock can be traced on the phone alone (no adb). Remove once the
     * unlock path is known to work.
     */
    @Synchronized
    fun traceMindfulnessBell(stage: String, error: Throwable? = null) {
        try {
            val trace = sharedPreferences.getString(BELL_TRACE_KEY, null)
                ?.let { org.json.JSONObject(it) } ?: org.json.JSONObject()
            trace.put(stage, System.currentTimeMillis())
            if (error != null) trace.put("error", "$stage: ${error.javaClass.simpleName}: ${error.message}")
            sharedPreferences.edit().putString(BELL_TRACE_KEY, trace.toString()).apply()
        } catch (e: Exception) {
            Log.e(logTag, "Failed to trace bell stage $stage", e)
        }
    }

    /**
     * TEMPORARY test aid: ring at the next unlock regardless of the schedule
     * (the moment checks still apply). Cleared once that bell rings.
     */
    fun setMindfulnessBellTestArmed(armed: Boolean) {
        sharedPreferences.edit().putBoolean(BELL_TEST_ARMED_KEY, armed).apply()
    }

    fun isMindfulnessBellTestArmed(): Boolean =
        sharedPreferences.getBoolean(BELL_TEST_ARMED_KEY, false)

    fun getMindfulnessBellTrace(): String? =
        sharedPreferences.getString(BELL_TRACE_KEY, null)

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

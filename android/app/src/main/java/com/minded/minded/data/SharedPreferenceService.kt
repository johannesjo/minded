import android.content.Context
import android.content.SharedPreferences
import android.util.Log
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
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences(DB_NAME, Context.MODE_PRIVATE)

    fun saveString(key: String, value: String) {
        with(sharedPreferences.edit()) {
            putString(key, value)
            apply()
        }
    }

    fun retrieveString(key: String): String? {
        return sharedPreferences.getString(key, null)
    }

    fun getSyncData(): SyncData {
        return try {
            val allStr = retrieveString(DB_KEY)
            parseSyncData(allStr!!)
        } catch (e: Exception) {
            // Log the exception if necessary
            Log.e(logTag, "Error getting sync data", e)
            defaultSyncData
        }
    }

    fun saveSyncData(syncData: SyncData) {
        saveString(DB_KEY, syncDataToJson(syncData))
    }

    fun updateSyncData(update: SyncData.() -> Unit) {
        val syncData = getSyncData()
        saveSyncData(syncData.apply(update))
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
        return syncData.cfg.blockedApps
    }

    fun countLittleSunTap() {
        val syncData = getSyncData()
        val isoDateToday = getIsoDate()

        val updatedAttempts = syncData.attempts.toMutableMap().apply {
            this[isoDateToday] = this.getOrDefault(isoDateToday, 0) + 1
        }

        val updatedSyncData = syncData.copy(attempts = updatedAttempts)
        saveSyncData(updatedSyncData)
    }
}

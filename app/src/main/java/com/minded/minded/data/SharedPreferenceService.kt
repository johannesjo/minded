import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.minded.minded.util.parseSyncData

class SharedPreferenceService(context: Context) {
    private val logTag = "SharedPreferenceService"
    private val sharedPreferences: SharedPreferences =
        context.getSharedPreferences("mindedData", Context.MODE_PRIVATE)

    fun saveString(key: String, value: String) {
        with(sharedPreferences.edit()) {
            putString(key, value)
            apply()
        }
    }

    fun retrieveString(key: String): String? {
        return sharedPreferences.getString(key, null)
    }

    fun getBlockedApps(): List<String> {
        return try {
            val allStr = retrieveString("mindedAll")
            val syncData = parseSyncData(allStr!!)
            syncData.cfg.blockedApps
        } catch (e: Exception) {
            // Log the exception if necessary
            Log.e(logTag, "Error getting blocked apps", e)
            emptyList()
        }
    }
}

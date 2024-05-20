import android.content.Context
import android.content.SharedPreferences
import com.minded.minded.util.parseSyncData

class SharedPreferenceService(context: Context) {
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
        val allStr = retrieveString("mindedAll")
        val syncData = parseSyncData(allStr!!)
        return syncData.cfg.blockedApps
    }
}

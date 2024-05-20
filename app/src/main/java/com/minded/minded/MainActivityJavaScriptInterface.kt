import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

open class MainActivityJavaScriptInterface(
    protected val context: Context,
) {
    private val sharedPreferenceService = SharedPreferenceService(context)
    var logTag = "MainActivityJavaScriptInterface"

    @JavascriptInterface
    fun saveString(key: String, value: String) {
        Log.v(logTag, "saveString() $value")
        sharedPreferenceService.saveString(key, value)
    }

    @JavascriptInterface
    fun retrieveString(key: String): String? {
        Log.v(logTag, "retrieveString() $key")
        return sharedPreferenceService.retrieveString(key)
    }

    @JavascriptInterface
    fun getAllApps(): String {
        val allApps = getInstalledApps()
        val jsonArray = JSONArray()
        for (app in allApps) {
            val jsonObject = JSONObject()
            jsonObject.put("packageName", app.packageName)
            jsonObject.put("name", app.loadLabel(context.packageManager).toString())
            jsonArray.put(jsonObject)
        }
        return jsonArray.toString()
    }

    private fun getInstalledApps(): List<ApplicationInfo> {
        val packageManager = context.packageManager
        val allApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
        return allApps.filter { app ->
            ((app.flags and ApplicationInfo.FLAG_SYSTEM == 0) || app.packageName in listOf(
                "com.android.chrome",
                "com.google.android.youtube"
            )) && app.packageName != context.packageName
        }
    }
}

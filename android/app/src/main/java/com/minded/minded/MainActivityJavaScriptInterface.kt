package com.minded.minded

import android.content.Context
import android.content.pm.ApplicationInfo
import com.minded.minded.data.SharedPreferenceService
import com.minded.minded.sleepwinddown.SleepWindDownAlarmScheduler
import com.minded.minded.sleepwinddown.SleepWindDownNotifier
import android.content.pm.PackageManager
import android.util.Log
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.lifecycle.viewModelScope
import com.minded.minded.MissingCapability
import com.minded.minded.util.checkDrawOverlayPermission
import com.minded.minded.util.isAccessibilityServiceEnabled
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

open class MainActivityJavaScriptInterface(
    protected val context: Context,
    protected open val webView: WebView,
    protected val onMissingCapabilityClickI: (MissingCapability) -> Unit = {},
    protected val getMissingCapabilitiesI: () -> List<MissingCapability> = { emptyList<MissingCapability>() },
) {
    private val sharedPreferenceService = SharedPreferenceService(context)

    var logTag = "MainActivityJavaScriptInterface"

    @JavascriptInterface
    fun saveDataString(value: String) {
        if (BuildConfig.DEBUG) {
            Log.v(logTag, "saveString() $value")
        }
        sharedPreferenceService.saveDataString(value)
    }

    @JavascriptInterface
    fun retrieveDataString(): String? {
        Log.v(logTag, "retrieveString()")
        return sharedPreferenceService.retrieveDataString()
    }

    @JavascriptInterface
    fun requestFocusAndShowKeyboard() {
        Log.v(logTag, "requestFocusAndShowKeyboard()")
        webView.requestFocus()
        val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT)
    }

    @JavascriptInterface
    fun onMissingCapabilityClick(capability: String) {
        Log.v(logTag, "onMissingCapabilityClick()")
        try {
            onMissingCapabilityClickI(MissingCapability.valueOf(capability))
        } catch (e: IllegalArgumentException) {
            Log.e(logTag, "Unknown capability: $capability", e)
        }
    }

    @JavascriptInterface
    fun getMissingCapabilities(): String {
        Log.v(logTag, "getMissingCapabilities()")
        val jsonArray = JSONArray()
        getMissingCapabilitiesI().map { it.name }.forEach { jsonArray.put(it) }
        return jsonArray.toString()
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

    /**
     * Re-evaluate and re-schedule the next sleep wind-down alarm based on
     * the latest persisted cfg. The TS layer must call this after any
     * change to `cfg.sleepWindDown` or to the snooze/dismiss state.
     */
    @JavascriptInterface
    fun scheduleSleepWindDownAlarms() {
        Log.v(logTag, "scheduleSleepWindDownAlarms()")
        SleepWindDownAlarmScheduler.scheduleNext(context)
    }

    /**
     * Cancel the next scheduled wind-down alarm and dismiss the
     * notification (if visible). Called when the user disables wind-down
     * or skips for tonight.
     */
    @JavascriptInterface
    fun cancelSleepWindDownAlarms() {
        Log.v(logTag, "cancelSleepWindDownAlarms()")
        SleepWindDownAlarmScheduler.cancel(context)
        SleepWindDownNotifier.cancel(context)
    }

    private fun getInstalledApps(): List<ApplicationInfo> {
        val packageManager = context.packageManager
        val allApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
        return allApps.filter { app ->
            ((app.flags and ApplicationInfo.FLAG_SYSTEM == 0) || app.packageName in listOf(
                "com.android.chrome",
                "com.google.android.youtube"
            )) && app.packageName != context.packageName
        }.sortedBy { app ->
            app.loadLabel(packageManager).toString()
        }
    }
}

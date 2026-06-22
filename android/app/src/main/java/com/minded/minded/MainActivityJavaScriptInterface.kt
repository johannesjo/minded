package com.minded.minded

import android.content.Context
import android.content.pm.ApplicationInfo
import com.minded.minded.data.SharedPreferenceService
import android.content.pm.PackageManager
import android.util.Log
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.minded.minded.MissingCapability
import com.minded.minded.util.SafeAreaInsetsHolder
import com.minded.minded.util.getAppUsageObservation
import org.json.JSONArray
import org.json.JSONObject

open class MainActivityJavaScriptInterface(
    protected val context: Context,
    protected open val webView: WebView,
    protected val onMissingCapabilityClickI: (MissingCapability) -> Unit = {},
    protected val getMissingCapabilitiesI: () -> List<MissingCapability> = { emptyList<MissingCapability>() },
    /**
     * Latest system-bar + display-cutout insets, written by
     * [com.minded.minded.util.ForwardSafeAreaInsetsToWebView] and read by
     * the web layer via [getSafeAreaInsets] on init. Passed in by the
     * caller so the same holder is shared with the Compose-side forwarder
     * — the main activity and each overlay window own their own holder
     * because they live in different windows with independent insets.
     */
    val safeAreaInsets: SafeAreaInsetsHolder = SafeAreaInsetsHolder(),
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
    fun getSafeAreaInsets(): String = safeAreaInsets.toJsonString()

    /**
     * Real per-app foreground usage for the present-moment usage observation
     * (replaces the old self-rating). Returns UsageObservation JSON, or "" when
     * unavailable (usage access not granted, no configured apps, no usage).
     */
    @JavascriptInterface
    fun getUsageObservation(): String {
        return getAppUsageObservation(context) ?: ""
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

package com.minded.minded

import android.appwidget.AppWidgetManager
import android.content.ComponentName
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
import com.minded.minded.widget.MyAppWidgetReceiver
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
     * Current media-stream volume as a percentage (0–100), or -1 when it can't
     * be read. The web layer uses this to keep sound-dependent interventions
     * (the bell) from being offered when they'd ring silently: the WebView
     * plays on STREAM_MUSIC, which the silent/vibrate ringer switch does NOT
     * mute — media volume turned all the way down is the case that matters.
     * -1 (unknown) is treated as audible on the web side, so failure here
     * degrades softly instead of removing the mode.
     */
    @JavascriptInterface
    fun getMediaVolume(): Int {
        return try {
            val audioManager =
                context.getSystemService(Context.AUDIO_SERVICE) as android.media.AudioManager
            val max = audioManager.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC)
            val current = audioManager.getStreamVolume(android.media.AudioManager.STREAM_MUSIC)
            if (max <= 0) -1 else (current * 100) / max
        } catch (e: Exception) {
            Log.e(logTag, "getMediaVolume failed", e)
            -1
        }
    }

    /**
     * Real per-app foreground usage for the present-moment usage observation
     * (replaces the old self-rating). Returns UsageObservation JSON, or "" when
     * unavailable (usage access not granted, no configured apps, no usage).
     */
    @JavascriptInterface
    fun getUsageObservation(): String {
        return getAppUsageObservation(context) ?: ""
    }

    /**
     * Whether the home-screen sun widget is currently placed on any launcher
     * surface. The web setup surfaces stay truthful with this: "your home
     * screen" reads as a chosen place only once the widget really exists, and
     * invitations retire themselves when it does.
     */
    @JavascriptInterface
    fun isWidgetPlaced(): Boolean {
        return try {
            val manager = AppWidgetManager.getInstance(context)
            val provider = ComponentName(context, MyAppWidgetReceiver::class.java)
            manager.getAppWidgetIds(provider).isNotEmpty()
        } catch (e: Exception) {
            Log.e(logTag, "isWidgetPlaced failed", e)
            false
        }
    }

    /**
     * Ask the launcher to pin the sun widget via the system dialog. Returns
     * false when the launcher doesn't support pinning (the web side then shows
     * a one-line manual instruction instead). The result of the dialog itself
     * is not awaited — the web side observes it through [isWidgetPlaced].
     */
    @JavascriptInterface
    fun requestPinWidget(): Boolean {
        return try {
            val manager = AppWidgetManager.getInstance(context)
            if (!manager.isRequestPinAppWidgetSupported) return false
            val provider = ComponentName(context, MyAppWidgetReceiver::class.java)
            manager.requestPinAppWidget(provider, null, null)
        } catch (e: Exception) {
            Log.e(logTag, "requestPinWidget failed", e)
            false
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

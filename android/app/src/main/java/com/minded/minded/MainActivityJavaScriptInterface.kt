package com.minded.minded

import android.app.Activity
import android.content.Context
import android.content.pm.ApplicationInfo
import com.minded.minded.data.SharedPreferenceService
import com.minded.minded.sleepwinddown.SleepWindDownAlarmScheduler
import com.minded.minded.sleepwinddown.SleepWindDownNotifier
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewModelScope
import com.minded.minded.MissingCapability
import com.minded.minded.util.SafeAreaInsetsHolder
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

    /**
     * Latest system-bar + display-cutout insets, written by
     * [com.minded.minded.util.WebViewSafeAreaBridge] and read by the web
     * layer via [getSafeAreaInsets] on init. Each instance owns its own
     * holder because the main and overlay WebViews live in different
     * windows with independent insets.
     */
    val safeAreaInsets: SafeAreaInsetsHolder = SafeAreaInsetsHolder()

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
     *
     * If wind-down is disabled, this also dismisses any visible notification
     * — see [SleepWindDownAlarmScheduler.scheduleNext].
     */
    @JavascriptInterface
    fun scheduleSleepWindDownAlarms() {
        Log.v(logTag, "scheduleSleepWindDownAlarms()")
        SleepWindDownAlarmScheduler.scheduleNext(context)
    }

    /**
     * Arm the next future bedtime only. This is used after the web layer has
     * already opened the wind-down route directly, where scheduleNext() would
     * otherwise post another notification for the current active window.
     */
    @JavascriptInterface
    fun scheduleNextFutureSleepWindDownAlarm() {
        Log.v(logTag, "scheduleNextFutureSleepWindDownAlarm()")
        SleepWindDownAlarmScheduler.scheduleNextFuture(context)
    }

    /**
     * Dismiss the wind-down notification if visible. Called when the user
     * enters the wind-down route from any path (notification tap, app launch,
     * dismiss-for-tonight, snooze) so the heads-up doesn't linger in the
     * notification shade while the user is already attending to it.
     */
    @JavascriptInterface
    fun dismissSleepWindDownNotification() {
        Log.v(logTag, "dismissSleepWindDownNotification()")
        SleepWindDownNotifier.cancel(context)
    }

    /**
     * Returns true if the app currently holds POST_NOTIFICATIONS or the
     * platform doesn't require it (Android < 13). The TS layer can use this
     * to decide whether to surface a pre-prompt before requesting.
     */
    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            "android.permission.POST_NOTIFICATIONS",
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Request POST_NOTIFICATIONS at runtime. No-op on Android < 13 or when
     * already granted. Caller cannot wait for the user's answer here — the
     * TS layer should re-check `hasNotificationPermission()` later or just
     * trust that the OS has prompted.
     */
    @JavascriptInterface
    fun requestNotificationPermission() {
        Log.v(logTag, "requestNotificationPermission()")
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val activity = context as? Activity ?: run {
            Log.w(logTag, "Cannot request notification permission without Activity")
            return
        }
        if (ContextCompat.checkSelfPermission(
                activity,
                "android.permission.POST_NOTIFICATIONS",
            ) == PackageManager.PERMISSION_GRANTED
        ) return
        ActivityCompat.requestPermissions(
            activity,
            arrayOf("android.permission.POST_NOTIFICATIONS"),
            REQUEST_CODE_POST_NOTIFICATIONS,
        )
    }

    companion object {
        const val REQUEST_CODE_POST_NOTIFICATIONS = 6624
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

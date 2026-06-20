package com.minded.minded

import com.minded.minded.data.SharedPreferenceService
import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.ViewGroup
import android.webkit.ValueCallback
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.OnBackPressedCallback
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.ui.graphics.Brush
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.ui.theme.AppBgGradientDarkStops
import com.minded.minded.ui.theme.AppBgGradientLightStops
import com.minded.minded.ui.theme.MindedTheme
import com.minded.minded.util.ForwardSafeAreaInsetsToWebView
import com.minded.minded.util.SafeAreaInsetsHolder
import com.minded.minded.util.checkDrawOverlayPermission
import com.minded.minded.util.checkIgnoringBatteryOptimizations
import com.minded.minded.util.checkUsageStatsPermission
import com.minded.minded.util.isAccessibilityServiceEnabled
import com.minded.minded.util.isDarkModeNow
import kotlinx.coroutines.launch


enum class MissingCapability {
    Accessibility, SystemAlertWindow, UsageStats, BatteryOptimization;
}

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var sharedPreferenceService: SharedPreferenceService
    private val safeAreaInsetsHolder = SafeAreaInsetsHolder()
    private val webAppResumeEVName = "androidAppResume"
    private val jsInterfaceNameProp = "androidMinded"
    private val logTag = "MainActivity"


    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Make edge-to-edge explicit on API 35+ so Compose's WindowInsets
        // observe system-bar + display-cutout insets and
        // `ForwardSafeAreaInsetsToWebView` can populate the
        // `--safe-area-inset-*` CSS variables. The previously used
        // `windowOptOutEdgeToEdgeEnforcement` opt-out silently zeroed those
        // insets and is deprecated in Android 16.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            enableEdgeToEdge()
        }
        super.onCreate(savedInstanceState)
        // Paint the loading sky behind the WebView to match the app's time-based
        // dark mode (the theme's windowBackground covers the very first frame in
        // light). Keep in sync with isDarkModeNow (19:00–06:00).
        window.setBackgroundDrawableResource(
            if (isDarkModeNow()) R.drawable.loading_gradient_dark
            else R.drawable.loading_gradient_light
        )
        Log.v(logTag, "ON_CREATE MAIN ACTIVITY")
        sharedPreferenceService = SharedPreferenceService(this)
        sharedPreferenceService.writeDefaultDataIfNecessary()
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                goBackOrFinish()
            }
        })

        lifecycleScope.launch {
            setContent {
                MindedTheme {
                    val webViewState = remember { mutableStateOf<WebView?>(null) }
                    ForwardSafeAreaInsetsToWebView(webViewState.value, safeAreaInsetsHolder)
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding()
                            .background(
                                Brush.verticalGradient(
                                    *(if (isDarkModeNow()) AppBgGradientDarkStops
                                    else AppBgGradientLightStops)
                                )
                            )
                    ) {
                        AndroidView(factory = { context ->
                            webView = MyWebView(context).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                // Transparent until the web content paints, so the
                                // gradient behind shows during load instead of the
                                // WebView's default white.
                                setBackgroundColor(android.graphics.Color.TRANSPARENT)
                                settings.javaScriptEnabled = true
                                settings.allowFileAccess = true
                                settings.allowFileAccessFromFileURLs = true
                                settings.allowUniversalAccessFromFileURLs = true
                                settings.allowContentAccess = true
                                settings.mediaPlaybackRequiresUserGesture = false
                                // Disable caching to always load fresh content
                                settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    // API 33+: forceDark is deprecated. Algorithmic darkening
                                    // requires WebSettingsCompat from androidx.webkit dependency.
                                    // Dark mode is handled by the web content's CSS instead.
                                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                    @Suppress("DEPRECATION")
                                    settings.forceDark = WebSettings.FORCE_DARK_ON
                                }
                                val jsInterface = MainActivityJavaScriptInterface(
                                    context,
                                    this,
                                    ::onMissingCapabilityTap,
                                    ::getMissingCapabilities,
                                    safeAreaInsets = safeAreaInsetsHolder,
                                )
                                addJavascriptInterface(jsInterface, jsInterfaceNameProp)
                                loadUrl("file:///android_asset/web/src/android/main/index.html")
                            }
                            webView.setScrollBarStyle(WebView.SCROLLBARS_OUTSIDE_OVERLAY)
                            webView.setScrollbarFadingEnabled(false)
                            webViewState.value = webView
                            webView
                        })
                    }
                }
            }
        }
    }

    private fun onMissingCapabilityTap(capability: MissingCapability) {
        when (capability) {
            MissingCapability.Accessibility -> askPermissionForAccessibility()
            MissingCapability.SystemAlertWindow -> askPermissionForOverlay()
            MissingCapability.UsageStats -> askPermissionForUsageStats()
            MissingCapability.BatteryOptimization -> askToDisableBatteryOptimization()
        }
    }

    private fun goBackOrFinish() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        Log.v(logTag, "onResume()")
        // TODO refresh web view
        if (this::webView.isInitialized) {
            webView.evaluateJavascript("(function() { window.dispatchEvent(new Event('${webAppResumeEVName}')); })();",
                ValueCallback<String?> { })
        }

//        // always hide all overlays on resume
//        OverlayControllerService.hideOverlay(
//            this,
//            OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY
//        )
//        OverlayControllerService.hideOverlay(
//            this,
//            OverlayControllerService.Companion.OverlayName.SMALL_MSG_OVERLAY
//        )
//        OverlayControllerService.hideOverlay(
//            this,
//            OverlayControllerService.Companion.OverlayName.LITTLE_SUN_OVERLAY
//        )
    }


    private fun askPermissionForOverlay() {
        startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
        )
    }


    private fun askPermissionForAccessibility() {
        startActivity(
            Intent(
                Settings.ACTION_ACCESSIBILITY_SETTINGS
            )
        )
    }

    private fun askPermissionForUsageStats() {
        // No package URI: not officially supported for this action and crashes
        // on some OEM settings apps
        startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    }

    private fun askToDisableBatteryOptimization() {
        try {
            // Shows a direct allow/deny dialog for this app
            @SuppressLint("BatteryLife")
            val intent = Intent(
                Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:$packageName")
            )
            startActivity(intent)
        } catch (e: Exception) {
            Log.e(logTag, "Direct battery optimization request failed, opening settings list", e)
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    private fun getMissingCapabilities(): List<MissingCapability> {
        Log.v(
            logTag,
            "getMissingCapabilities()  ${isAccessibilityServiceEnabled(this).toString()}"
        )
        var missingCapabilities = emptyList<MissingCapability>()
        if (!checkDrawOverlayPermission(this)) {
            missingCapabilities += MissingCapability.SystemAlertWindow
        }
        if (!isAccessibilityServiceEnabled(this)) {
            missingCapabilities += MissingCapability.Accessibility
        }
        if (!checkUsageStatsPermission(this)) {
            missingCapabilities += MissingCapability.UsageStats
        }
        if (!checkIgnoringBatteryOptimizations(this)) {
            missingCapabilities += MissingCapability.BatteryOptimization
        }
        return missingCapabilities
    }
}

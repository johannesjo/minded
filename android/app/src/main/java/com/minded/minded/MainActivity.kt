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
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.sleepwinddown.SleepWindDownNotifier
import com.minded.minded.ui.theme.MindedTheme
import com.minded.minded.util.checkDrawOverlayPermission
import com.minded.minded.util.isAccessibilityServiceEnabled
import kotlinx.coroutines.launch


enum class MissingCapability {
    Accessibility, SystemAlertWindow;
}

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var sharedPreferenceService: SharedPreferenceService
    private val webAppResumeEVName = "androidAppResume"
    private val jsInterfaceNameProp = "androidMinded"
    private val logTag = "MainActivity"


    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.v(logTag, "ON_CREATE MAIN ACTIVITY")
        sharedPreferenceService = SharedPreferenceService(this)
        sharedPreferenceService.writeDefaultDataIfNecessary()
        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true)
        }

        lifecycleScope.launch {
            setContent {
                MindedTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        AndroidView(factory = { context ->
                            webView = MyWebView(context).apply {
                                layoutParams = ViewGroup.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
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
                                addJavascriptInterface(
                                    MainActivityJavaScriptInterface(
                                        context,
                                        this,
                                        ::onMissingCapabilityTap,
                                        ::getMissingCapabilities,
                                    ),
                                    jsInterfaceNameProp
                                )
                                loadUrl(buildLaunchUrl(intent))
                                // Consume the extra so that a Recents
                                // rehydration of the same intent doesn't
                                // re-route to wind-down outside the window.
                                intent?.removeExtra(SleepWindDownNotifier.EXTRA_OPEN_SLEEP_WIND_DOWN)
                                setIntent(intent)
                            }
                            webView.setScrollBarStyle(WebView.SCROLLBARS_OUTSIDE_OVERLAY)
                            webView.setScrollbarFadingEnabled(false)
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
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (shouldOpenSleepWindDown(intent) && this::webView.isInitialized) {
            // Reload the SPA at the wind-down hash. onResume will dispatch
            // androidAppResume so any data signals refresh as usual.
            webView.loadUrl(buildLaunchUrl(intent))
            // Consume the extra so a later resume-from-Recents doesn't re-fire it.
            intent.removeExtra(SleepWindDownNotifier.EXTRA_OPEN_SLEEP_WIND_DOWN)
        }
    }

    private fun shouldOpenSleepWindDown(intent: Intent?): Boolean =
        intent?.getBooleanExtra(SleepWindDownNotifier.EXTRA_OPEN_SLEEP_WIND_DOWN, false) == true

    private fun buildLaunchUrl(intent: Intent?): String {
        val base = "file:///android_asset/web/src/android/main/index.html"
        return if (shouldOpenSleepWindDown(intent)) "$base#/sleepWindDown" else base
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
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
        return missingCapabilities
    }
}

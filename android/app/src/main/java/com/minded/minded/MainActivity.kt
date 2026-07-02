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
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.imePadding
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.paint
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.lifecycleScope
import com.minded.minded.overlay.OverlayControllerService
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
    private val webAppPauseEVName = "androidAppPause"
    private val jsInterfaceNameProp = "androidMinded"
    private val logTag = "MainActivity"
    private val baseUrl = "file:///android_asset/web/src/android/main/index.html"

    companion object {
        /** Intent extra naming a hash route to open on launch (allow-listed below). */
        const val EXTRA_LAUNCH_ROUTE = "launch_route"
        /**
         * The home-screen sun widget opens the dashboard with this hash, which the
         * web shell reads to fire the same interaction overlay as tapping the
         * in-app companion sun (see RouteCmp's `?sun=open` effect).
         */
        const val OPEN_SUN_HASH = "/?sun=open"

        /** Fade-in duration when the WebView first paints over the loading sky. */
        private const val WEBVIEW_FADE_IN_MS = 300L

        /**
         * Safety net: reveal the WebView even if onPageCommitVisible never arrives
         * (e.g. a stalled bundle), so a load hiccup can't strand the app on the
         * loading sky forever.
         */
        private const val WEBVIEW_REVEAL_TIMEOUT_MS = 2500L
    }

    /**
     * The hash requested by the launching intent, if any — currently only the
     * widget's sun hash. Allow-listed (not passed through verbatim) so a crafted
     * intent can't drive the WebView to an arbitrary location.
     */
    private fun routeFromIntent(intent: Intent?): String? =
        when (intent?.getStringExtra(EXTRA_LAUNCH_ROUTE)) {
            OPEN_SUN_HASH -> OPEN_SUN_HASH
            else -> null
        }


    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Go edge-to-edge on every supported API (minSdk 29) with fully
        // transparent system bars, so the pastel sky runs under the status and
        // navigation bars as one continuous field instead of being capped by a
        // black seam. Compose's WindowInsets observe the system-bar +
        // display-cutout insets and `ForwardSafeAreaInsetsToWebView` bridges
        // them to the `--safe-area-inset-*` CSS variables, so content still
        // clears the bars. Bar icon contrast follows the app's clock-based dark
        // mode: dark icons over the light daytime sky, light icons at night.
        // (Transparent scrims give truly edge-to-edge bars on API 29-34, where a
        // bare enableEdgeToEdge() would otherwise apply a contrast scrim; on
        // API 35+ the bars are transparency-enforced and only the icon style
        // applies. minSdk 29 >= 23, so the dark-icon fallback scrim never runs.
        // The previously used `windowOptOutEdgeToEdgeEnforcement` opt-out
        // silently zeroed those insets and is deprecated in Android 16.)
        val barStyle = if (isDarkModeNow()) {
            SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
        } else {
            SystemBarStyle.light(
                android.graphics.Color.TRANSPARENT,
                android.graphics.Color.TRANSPARENT,
            )
        }
        enableEdgeToEdge(statusBarStyle = barStyle, navigationBarStyle = barStyle)
        super.onCreate(savedInstanceState)
        // Correct the activity window's background to match the app's time-based
        // dark mode. On API 31+ the starting window already arrives correct via
        // MindedApplication's per-app night override + values-night-v31 (issue
        // #117); this stays as the API < 31 correction and a belt-and-suspenders
        // safety net. Keep in sync with isDarkModeNow (19:00–06:00).
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
                            // Keyboard/IME avoidance, native side. Two mechanisms
                            // are intentional and cover complementary API ranges,
                            // not redundant: `imePadding()` (WindowInsets.ime,
                            // reliable API 30+) does the work on API 35+, where
                            // edge-to-edge ignores the manifest's adjustResize;
                            // adjustResize covers API 29 (minSdk), where the ime
                            // inset isn't dispatched and imePadding no-ops. They
                            // don't stack: the ime inset is measured against the
                            // already-resized window. This is the *only* keyboard
                            // mechanism now — the web layer keys off the resulting
                            // viewport (visualViewport) rather than probing the
                            // window height itself.
                            .imePadding()
                            // Pre-dithered loading sky (same bitmap as the
                            // window background) shows behind the transparent
                            // WebView until the web sky paints. Stretched to
                            // fill; banding is baked out in the pixels.
                            .paint(
                                painterResource(
                                    if (isDarkModeNow()) R.drawable.loading_sky_dark
                                    else R.drawable.loading_sky_light
                                ),
                                contentScale = ContentScale.FillBounds
                            )
                    ) {
                        AndroidView(factory = { context ->
                            webView = WebView(context).apply {
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
                                // Stay invisible until the first real frame commits; the
                                // half-initialised transparent surface would otherwise
                                // show as the cold-start teal/orange compositing stripes.
                                // Fade in over the native loading sky so the native->web
                                // handoff stays soft instead of hard-cutting.
                                alpha = 0f
                                webViewClient = object : WebViewClient() {
                                    override fun onPageCommitVisible(view: WebView?, url: String?) {
                                        super.onPageCommitVisible(view, url)
                                        view?.animate()?.alpha(1f)
                                            ?.setDuration(WEBVIEW_FADE_IN_MS)?.start()
                                    }
                                }
                                // Cold start: if launched from the widget, load the
                                // dashboard with the sun hash so the shell opens the
                                // interaction overlay on first paint.
                                val route = routeFromIntent(intent)
                                loadUrl(if (route != null) "$baseUrl#$route" else baseUrl)
                                // Safety net: reveal even if onPageCommitVisible never
                                // arrives (e.g. a stalled bundle), so a load hiccup can't
                                // strand the app on the loading sky.
                                postDelayed({
                                    if (alpha < 1f) {
                                        animate().alpha(1f).setDuration(WEBVIEW_FADE_IN_MS).start()
                                    }
                                }, WEBVIEW_REVEAL_TIMEOUT_MS)
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

    override fun onPause() {
        super.onPause()
        Log.v(logTag, "onPause()")
        // Tell the web layer the app is leaving the foreground so it can time how
        // long we're away (used to decide whether a return is a fresh visit — see
        // the dashboard re-greet). The WebView keeps running in the background, so
        // it gets no visibilitychange of its own; this event is its only signal.
        if (this::webView.isInitialized) {
            webView.evaluateJavascript("(function() { window.dispatchEvent(new Event('${webAppPauseEVName}')); })();",
                ValueCallback<String?> { })
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


    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // singleTask: a re-tap of the widget while the app is alive arrives here,
        // not in onCreate. Set the live WebView's hash so the shell opens the sun
        // interaction. The resume → maybeTriggerSleepWindDown redirect only fires
        // from root, so it won't clobber this.
        setIntent(intent)
        val route = routeFromIntent(intent) ?: return
        if (this::webView.isInitialized) {
            webView.evaluateJavascript(
                "(function() { window.location.hash = '#$route'; })();",
                ValueCallback<String?> { },
            )
        }
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

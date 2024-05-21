package com.minded.minded

import MainActivityJavaScriptInterface
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.ui.compose.Dashboard
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.ui.model.DashboardViewModelFactory
import com.minded.minded.ui.theme.MindedTheme
import com.minded.minded.util.checkDrawOverlayPermission
import com.minded.minded.util.isAccessibilityServiceEnabled
import kotlinx.coroutines.launch


enum class MissingCapability {
    Accessibility, SystemAlertWindow;
}

class MainActivity : AppCompatActivity() {
    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var webView: WebView

    private val webAppResumeEVName = "androidAppResume"


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.v("MAIN", "ON_CREATE MAIN ACTIVITY")
        val viewModelFactory = DashboardViewModelFactory()
        dashboardViewModel =
            ViewModelProvider(this, viewModelFactory)[DashboardViewModel::class.java]


        lifecycleScope.launch {
            setContent {
                MindedTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        val uiState by dashboardViewModel.uiState.collectAsState()
                        val missingCapabilities = uiState.missingCapabilities
                        if (missingCapabilities.isEmpty()) {
                            AndroidView(factory = { context ->
                                webView = WebView(context).apply {
                                    layoutParams = ViewGroup.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT
                                    )
                                    settings.javaScriptEnabled = true
                                    settings.allowFileAccess = true
                                    settings.allowFileAccessFromFileURLs = true
                                    settings.allowUniversalAccessFromFileURLs = true
                                    settings.allowContentAccess = true
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                                        settings.forceDark = WebSettings.FORCE_DARK_ON
                                    }
                                    addJavascriptInterface(
                                        MainActivityJavaScriptInterface(context),
                                        "androidMinded"
                                    )
                                    loadUrl("file:///android_asset/web/src/android/main/index.html")
                                }
                                webView
                            })
                        } else {
                            Dashboard(
                                dashboardViewModel,
                                onMissingCapabilityClick = {
                                    Log.v("MAIN", "onMissingCapabilityClick() $it")
                                    when (it) {
                                        MissingCapability.Accessibility -> askPermissionForAccessibility()
                                        MissingCapability.SystemAlertWindow -> askPermissionForOverlay()
                                    }
                                },
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        Log.v("MAIN", "onResume()")
        // TODO refresh web view
        checkAndUpdateCapabilities()
        if (this::webView.isInitialized) {
            webView.evaluateJavascript("(function() { window.dispatchEvent(new Event('${webAppResumeEVName}')); })();",
                ValueCallback<String?> { })
        }

        // always hide all overlays on resume
        OverlayControllerService.hideOverlay(
            this,
            OverlayControllerService.Companion.OverlayName.INTERACTION_OVERLAY
        );
        OverlayControllerService.hideOverlay(
            this,
            OverlayControllerService.Companion.OverlayName.SMALL_MSG_OVERLAY
        );
        OverlayControllerService.hideOverlay(
            this,
            OverlayControllerService.Companion.OverlayName.LITTLE_SUN_OVERLAY
        );
    }


    private fun checkAndUpdateCapabilities() {
        Log.v(
            "MAIN",
            "checkAndUpdateCapabilities()  ${isAccessibilityServiceEnabled(this).toString()}"
        )
        var missingCapabilities = emptyList<MissingCapability>()

        if (!checkDrawOverlayPermission(this)) {
            missingCapabilities += MissingCapability.SystemAlertWindow
        }


        if (!isAccessibilityServiceEnabled(this)) {
            missingCapabilities += MissingCapability.Accessibility
        }
        dashboardViewModel.setMissingCapabilities(missingCapabilities)
    }

    private fun askPermissionForOverlay() {
        startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
        );
    }


    private fun askPermissionForAccessibility() {
        startActivity(
            Intent(
                Settings.ACTION_ACCESSIBILITY_SETTINGS
            )
        );
    }

    private fun getInstalledApps(packageManager: PackageManager): List<ApplicationInfo> {
        return packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
    }
}

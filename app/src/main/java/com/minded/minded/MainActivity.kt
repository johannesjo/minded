package com.minded.minded

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.ViewGroup
import android.webkit.WebView
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.ui.model.DashboardViewModelFactory
import com.minded.minded.util.checkDrawOverlayPermission
import com.minded.minded.util.isAccessibilityServiceEnabled
import kotlinx.coroutines.launch

enum class MissingCapability {
    Accessibility, SystemAlertWindow;
}

class MainActivity : AppCompatActivity() {
    private lateinit var dashboardViewModel: DashboardViewModel


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.v("MAIN", "ON_CREATE MAIN ACTIVITY")
        val answerRepository = AnswerRepository(this)
        val viewModelFactory = DashboardViewModelFactory(answerRepository)
        dashboardViewModel =
            ViewModelProvider(this, viewModelFactory)[DashboardViewModel::class.java]

//        startActivity(Intent(this, AppPickerActivity::class.java));


        lifecycleScope.launch {
            setContent {
                AndroidView(factory = { context ->
                    WebView(context).apply {

                        layoutParams = ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        settings.javaScriptEnabled = true
                        settings.allowFileAccess = true
                        settings.allowFileAccessFromFileURLs = true
                        settings.allowUniversalAccessFromFileURLs = true
                        settings.allowContentAccess = true
                        loadUrl("file:///android_asset/web/src/android/main/index.html")
                    }
                })

//                MindedTheme {
//                    Surface(
//                        modifier = Modifier.fillMaxSize(),
//                        color = MaterialTheme.colorScheme.background
//                    ) {
//                        Dashboard(
//                            dashboardViewModel,
//                            onMissingCapabilityClick = {
//                                Log.v("MAIN", "onMissingCapabilityClick() $it")
//                                when (it) {
//                                    MissingCapability.Accessibility -> askPermissionForAccessibility()
//                                    MissingCapability.SystemAlertWindow -> askPermissionForOverlay()
//                                }
//                            },
//                        )
//                    }
//                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        Log.v("MAIN", "onResume()")
        dashboardViewModel.loadAnswersFlow()
        checkAndUpdateCapabilities()
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

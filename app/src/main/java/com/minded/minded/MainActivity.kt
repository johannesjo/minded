package com.minded.minded

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
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


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.v("MAIN", "ON_CREATE MAIN ACTIVITY")
        val viewModelFactory = DashboardViewModelFactory()
        dashboardViewModel =
            ViewModelProvider(this, viewModelFactory)[DashboardViewModel::class.java]

//        startActivity(Intent(this, AppPickerActivity::class.java));

        lifecycleScope.launch {
            setContent {
                MindedTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
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

    override fun onResume() {
        super.onResume()
        Log.v("MAIN", "onResume()")
        // TODO refresh web view
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

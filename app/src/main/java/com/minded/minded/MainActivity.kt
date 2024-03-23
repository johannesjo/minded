package com.minded.minded

import com.minded.minded.ui.model.DashboardViewModelFactory
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.compose.Dashboard
import com.minded.minded.ui.theme.MindedTheme
import kotlinx.coroutines.launch


class MainActivity : AppCompatActivity() {
    private lateinit var dashboardViewModel: DashboardViewModel


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.v("MAIN", "ON_CREATE MAIN ACTIVITY")
        val answerRepository = AnswerRepository(this)
        val viewModelFactory = DashboardViewModelFactory(answerRepository)
        dashboardViewModel =
            ViewModelProvider(this, viewModelFactory)[DashboardViewModel::class.java]
        lifecycleScope.launch {
            setContent {
                MindedTheme {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        Dashboard(dashboardViewModel)
                    }
                }
            }
        }


        if (!MyUtil.checkDrawOverlayPermission(this)) {
            Toast.makeText(
                this,
                "You need System Alert Window Permission to do this",
                Toast.LENGTH_SHORT
            ).show()
            askPermissionForOverlay()
        }

        if (!MyUtil.checkUsageStatsPermission(this)) {
            Toast.makeText(
                this,
                "You need Usage stats Permission to do this",
                Toast.LENGTH_SHORT
            ).show()
            askPermissionForUsageStats()
//            finish()
        }
        if (!MyUtil.isAccessibilityServiceEnabled(this)) {
            Toast.makeText(
                this,
                "You need Accessibility Permission to do this",
                Toast.LENGTH_SHORT
            ).show()
            askPermissionForAccessibility()
//            finish()
        }

        Toast.makeText(
            this,
            "START SERVICE",
            Toast.LENGTH_SHORT
        ).show()
        startService(Intent(this, QuestionOverlayService::class.java))
    }

    override fun onResume() {
        super.onResume()
        dashboardViewModel.loadAnswersFlow()
    }

    private fun askPermissionForOverlay() {
        startActivity(
            Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:$packageName")
            )
        );
    }

    private fun askPermissionForUsageStats() {
        startActivity(
            Intent(
                Settings.ACTION_USAGE_ACCESS_SETTINGS,
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
}

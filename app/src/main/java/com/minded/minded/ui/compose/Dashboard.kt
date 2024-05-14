package com.minded.minded.ui.compose

import MainActivityJavaScriptInterface
import android.os.Build
import android.view.ViewGroup
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import com.minded.minded.MissingCapability
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.ui.theme.StandardGradient

@Composable
fun Dashboard(
    dashboardViewModel: DashboardViewModel = viewModel(),
    onMissingCapabilityClick: (MissingCapability) -> Unit = {},
) {
    val uiState by dashboardViewModel.uiState.collectAsState()
    val missingCapability = uiState.missingCapabilities
    DashboardMain(missingCapability, onMissingCapabilityClick)
}

@Composable
fun DashboardMain(
    missingCapabilities: List<MissingCapability>,
    onMissingCapabilityClick: (MissingCapability) -> Unit = {},
) {
    if (missingCapabilities.isNotEmpty()) {
        Box(
            modifier = Modifier
                .background(
                    brush = Brush.verticalGradient(
                        colors = StandardGradient
                    )
                )
        ) {
            MissingCapabilityView(missingCapabilities, onMissingCapabilityClick)
        }
    } else {
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    settings.forceDark = WebSettings.FORCE_DARK_ON
                }
                addJavascriptInterface(
                    MainActivityJavaScriptInterface(context),
                    "androidMinded"
                )
                loadUrl("file:///android_asset/web/src/android/main/index.html")
            }
        })
    }
}

@Composable
@Preview
fun DashboardMainPreview() {
    DashboardMain(
        emptyList(),
        onMissingCapabilityClick = { }
    )
}


@Composable
@Preview
fun DashboardMainPreview3() {
    DashboardMain(
        listOf(MissingCapability.Accessibility),
        onMissingCapabilityClick = { }
    )
}

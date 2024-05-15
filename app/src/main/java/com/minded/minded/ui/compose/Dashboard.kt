package com.minded.minded.ui.compose

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.viewmodel.compose.viewModel
import com.minded.minded.MissingCapability
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.ui.theme.StandardGradientLight

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
                        colors = StandardGradientLight
                    )
                )
        ) {
            MissingCapabilityView(missingCapabilities, onMissingCapabilityClick)
        }
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

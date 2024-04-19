package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.MissingCapability

@Composable
fun MissingCapabilityView(
    missingCapabilities: List<MissingCapability>,
    onMissingCapabilityClick: (MissingCapability) -> Unit = {}
) {
//    Text(text = "Missing capability: $missingCapability")

    Box(
        modifier = Modifier
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            Text(
                text = "Before you can use the app, you need to give the following permissions. Remember: minded does not collect any data. Everything stays on your device.",
                fontSize = 18.sp,
                textAlign = TextAlign.Center,
            )

            if (missingCapabilities.contains(MissingCapability.SystemAlertWindow)) {
                Spacer(modifier = Modifier.height(32.dp))
                Text(
                    text = "Minded displays an overlay to interrupt your visits to apps you want to use less. For this to work, minded needs the overlay permission.",
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { onMissingCapabilityClick(MissingCapability.SystemAlertWindow) }) {
                    Text("Enable Overlay Permission")
                }
            }

            if (missingCapabilities.contains(MissingCapability.Accessibility)) {
                Spacer(modifier = Modifier.height(32.dp))
                Text(
                    text = "The minded accessibility service is required to detect app starts on your device, so minded knows when to display the interaction overlay.",
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center,
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(onClick = { onMissingCapabilityClick(MissingCapability.Accessibility) }) {
                    Text("Enable Accessibility Service")
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            Text(
                text = "If the buttons above does not work, you can enable the accessibility service and the permission manually in your device settings.",
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "In case there are problems with the accessibility service, enabling, disabling and then enabling the service again will likely help.",
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
            )
        }
    }
}


@Composable
@Preview
fun MissingCapabilityViewPreview1() {
    MissingCapabilityView(
        listOf(
            MissingCapability.SystemAlertWindow,
            MissingCapability.Accessibility
        )
    )
}


@Composable
@Preview
fun MissingCapabilityViewPreview2() {
    MissingCapabilityView(listOf(MissingCapability.Accessibility))
}

@Composable
@Preview
fun MissingCapabilityViewPreview3() {
    MissingCapabilityView(listOf(MissingCapability.SystemAlertWindow))
}


package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
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
                text = "Before you can use the app, you need to give the following permissions:",
                fontSize = 18.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 8.dp)
            )
            if (missingCapabilities.contains(MissingCapability.Accessibility)) {
                Text(
                    text = "You need to enable the minded accessibility service. This service is used to detect app starts on your device, so minded can display the interaction overlay.",
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 8.dp)
                )

                Button(onClick = { onMissingCapabilityClick(MissingCapability.Accessibility) }) {
                    Text("Enable Accessibility Service")
                }


                Text(
                    text = "If the button above does not work, you can enable the service manually in your device settings.",
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(0.dp, 16.dp, 0.dp, 8.dp)
                )
                Text(
                    text = "In case there are problems after enabling the service, disabling and then enabling the service again will likely help.",
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 8.dp)
                )

            }
            if (missingCapabilities.contains(MissingCapability.SystemAlertWindow)) {
                Text(
                    text = "You need to give permission to display minded over other apps. minded uses this to display overlays.",
                    fontSize = 18.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(0.dp, 0.dp, 0.dp, 8.dp)
                )
                Button(onClick = { onMissingCapabilityClick(MissingCapability.SystemAlertWindow) }) {
                    Text("Enable Permission")
                }
            }
        }
    }
}


@Composable
@Preview
fun MissingCapabilityViewPreview() {
    MissingCapabilityView(listOf(MissingCapability.Accessibility))
}

@Composable
@Preview
fun MissingCapabilityViewPreview2() {
    MissingCapabilityView(listOf(MissingCapability.SystemAlertWindow))
}


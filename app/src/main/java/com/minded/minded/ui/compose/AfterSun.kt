package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp


@Preview
@Composable
fun AfterSun() {
    Box(
        modifier = Modifier
//            .background(Color.Green)
            .size(44.dp),
        contentAlignment = Alignment.Center // This will center the inner Box

    ) {
        Box(modifier = Modifier.size(32.dp)) {
            Surface(
                shape = CircleShape,
                color = Color.White,
                modifier = Modifier
                    .matchParentSize()
                    .shadow(elevation = 4.dp, shape = CircleShape) // Add shadow here

            ) {
                Box(contentAlignment = androidx.compose.ui.Alignment.Center) {
                    Text(text = "9:56")
                }
            }
        }
    }
}

//
//fun LittleSun() {
//    Box(
//        modifier = Modifier
//            .background(Color.Green)
//            .size(32.dp)
//            .padding(16.dp) // This will add padding around the box
//    ) {
//        Column(
//            verticalArrangement = Arrangement.SpaceBetween,
//            modifier = Modifier.fillMaxHeight()
//                .background(Color.Yellow),
//        ) {
//            Spacer(
//                modifier = Modifier
//                    .height(15.dp)
//            )
//
//            Surface(
//                shape = CircleShape,
//                color = Color.White,
//                modifier = Modifier.size(32.dp)
//            ) {
//                Box(contentAlignment = Alignment.Center) {
//                    Text(text = "9:56")
//                }
//            }
//        }
//    }
//}
//

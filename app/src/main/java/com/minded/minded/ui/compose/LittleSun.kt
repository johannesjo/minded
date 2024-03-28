package com.minded.minded.ui.compose

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp


@Preview
@Composable
fun LittleSun() {
    Box(modifier = Modifier.size(32.dp)) {
        Box(modifier = Modifier.size(32.dp)) {
            Surface(
                shape = CircleShape,
                color = Color.White,
                modifier = Modifier.matchParentSize()
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(text = "9:56")
                }
            }
        }
    }
}


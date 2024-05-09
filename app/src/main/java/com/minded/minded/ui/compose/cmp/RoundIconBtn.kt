package com.minded.minded.ui.compose.cmp

import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.minded.minded.ui.theme.WhiteBtnBG

@Composable
fun RoundIconButton(
    onClick: () -> Unit, content: @Composable() () -> Unit
) {
    Surface(
        shape = CircleShape,
        color = WhiteBtnBG,
//        elevation = FloatingActionButtonDefaults.elevation(
//            defaultElevation = 6.dp,
//            pressedElevation = 12.dp
//        )
    ) {
        IconButton(
            onClick = onClick,
            modifier = Modifier.size(40.dp)
        ) {
            content()
        }
    }
}

@Composable
@Preview(showBackground = true, backgroundColor = 0x0000000)
fun RoundIconButtonPreview() {
    RoundIconButton(onClick = {}) {
        Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = "Change Question"
        )
    }
}

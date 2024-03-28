package com.minded.minded.ui.compose

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.minded.minded.R


@Composable
fun TimerButtons(
    selectedSessionTime: Int,
    isShowTimeSelectionInitially: Boolean = false,
    onTimeSelected: (Int) -> Unit = {}
) {
    var isShowTimeSelection by remember { mutableStateOf(isShowTimeSelectionInitially) }
    var timeSelected by remember { mutableStateOf(selectedSessionTime) }

    fun timeSelect(v: Int) {
        isShowTimeSelection = false
        timeSelected = v;
        onTimeSelected(v)
    }
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        if (isShowTimeSelection) {

            Row {
                TimeSelectButton(1, onClick = { timeSelect(it) })
                Spacer(modifier = Modifier.width(4.dp))
                TimeSelectButton(3, onClick = { timeSelect(it) })
                Spacer(modifier = Modifier.width(4.dp))
                TimeSelectButton(5, onClick = { timeSelect(it) })
                Spacer(modifier = Modifier.width(4.dp))
                TimeSelectButton(10, onClick = { timeSelect(it) })
                Spacer(modifier = Modifier.width(4.dp))
                TimeSelectButton(15, onClick = { timeSelect(it) })
            }
        } else {
            if (timeSelected > 0) {
                TimeSelectButton(timeSelected, onClick = { isShowTimeSelection = true })
            } else {
                IconButton(
                    onClick = { isShowTimeSelection = true },
                    modifier = Modifier
                        .clip(CircleShape) // Clip to a circle shape
                        .border(2.dp, Color(0, 0, 0, 20), CircleShape) // Add a border
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_timer_24),
                        contentDescription = "Timer"
                    )
                }
            }
        }
        Text(
            text = if (timeSelected === 0 || isShowTimeSelection) "Select Session Limit" else "Session Limit",
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(8.dp),
            color = Color.Black.copy(alpha = 0.5f) // 50% opacity
        )
    }
}

@Composable
fun TimeSelectButton(
    timeVal: Int = 0,
    onClick: (Int) -> Unit
) {
    IconButton(
        onClick = { onClick(timeVal) },
        modifier = Modifier
            .clip(CircleShape) // Clip to a circle shape
            .border(
                2.dp,
                Color(0, 0, 0, 20),
                CircleShape
            ) // Add a border
    ) {
        Text(text = "${timeVal}m")
        Icon(
            painter = painterResource(id = R.drawable.ic_timer_24),
            contentDescription = "Timer",
            tint = Color.Black.copy(alpha = 0.1f) // 50% opacity
        )
    }
}


@Composable
@Preview(showBackground = true)
fun TimerButtonsPreview() {
    TimerButtons(0)
}

@Composable
@Preview(showBackground = true)
fun TimerButtonsPreview2() {
    TimerButtons(15)
}

@Composable
@Preview(showBackground = true)
fun TimerButtonsPreview3() {
    TimerButtons(0, isShowTimeSelectionInitially = true)
}

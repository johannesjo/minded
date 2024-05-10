@file:OptIn(ExperimentalMaterial3Api::class)

package com.minded.minded.ui.compose.interactions

import android.util.Log
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.overlay.data.SharedOverlayData
import com.minded.minded.overlay.data.SharedOverlayViewModel


@Composable
fun MoodSelectorCmp(
    sharedData: SharedOverlayData,
    sharedOverlayViewModel: SharedOverlayViewModel,
    onSubmitMood: (moodVal: String) -> Unit = { },
) {
    val logTag = "MoodSelectorCmp"
    val coroutineScope = rememberCoroutineScope()
    var moodSelected by remember { mutableStateOf("") }

    Log.v(logTag, "sharedData: $sharedData")


    // TODO enum
    fun timeSelect(v: String) {
        moodSelected = v;
//        onTimeSelected(v)
    }

    Column(
        verticalArrangement = Arrangement.Bottom,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "How do you feel?",
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .padding(16.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))

        Row {
            MoodSelectButton("Great", selectedMoodVal = moodSelected, onClick = { timeSelect(it) })
            Spacer(modifier = Modifier.width(8.dp))
            MoodSelectButton("Good", selectedMoodVal = moodSelected, onClick = { timeSelect(it) })
            Spacer(modifier = Modifier.width(8.dp))
            MoodSelectButton("Okay", selectedMoodVal = moodSelected, onClick = { timeSelect(it) })

        }
        Row {
            MoodSelectButton("Bad", selectedMoodVal = moodSelected, onClick = { timeSelect(it) })
            Spacer(modifier = Modifier.width(8.dp))
            MoodSelectButton("Awful", selectedMoodVal = moodSelected, onClick = { timeSelect(it) })
        }
    }
}


@Composable
fun MoodSelectButton(
    moodVal: String = "",
    selectedMoodVal: String = "",
    onClick: (String) -> Unit
) {
    if (selectedMoodVal == moodVal) {
        Button(
            onClick = { onClick(moodVal) },
            modifier = Modifier,
        ) {
            Text(text = "${moodVal}")
        }
    } else {
        FilledTonalButton(
            onClick = { onClick(moodVal) },
            modifier = Modifier,
        ) {
            Text(text = "${moodVal}")
        }
    }

}

@Composable
@Preview(showBackground = true, backgroundColor = 0xFFE4B7B7)
fun MoodSelectButtonPreview() {
    MoodSelectButton("Great", selectedMoodVal = "Great", onClick = { })
}

@Composable
@Preview(showBackground = true, backgroundColor = 0xFFE4B7B7)
fun MoodSelectButtonPreview2() {
    MoodSelectButton("Great", selectedMoodVal = "X", onClick = { })
}

@Composable
@Preview(showBackground = true, backgroundColor = 0xFFE4B7B7)
fun MoodSelectorCmpPreview() {
    val sharedData = SharedOverlayData()
    MoodSelectorCmp(
        sharedData = sharedData, sharedOverlayViewModel = SharedOverlayViewModel(
            answerRepository = null
        )
    )
}

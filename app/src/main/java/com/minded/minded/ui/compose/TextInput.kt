package com.minded.minded.ui.compose

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.tooling.preview.Preview
import com.minded.minded.ui.theme.Pink40
import com.minded.minded.ui.theme.PurpleGrey40


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TextInput(initialVal: String = "", onSubmit: (String) -> Unit = {}) {
    var textState by remember { mutableStateOf(TextFieldValue(initialVal)) }
    val focusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current
    TextField(
        singleLine = true,
        value = textState,
        onValueChange = { newTextState ->
            textState = newTextState.copy(
                text = newTextState.text,
            )
        },
        label = null,
        keyboardActions = KeyboardActions(
            onDone = {
                focusRequester.freeFocus()
                focusManager.clearFocus()
                keyboardController?.hide()
                onSubmit(textState.text)
            }
        ),
        keyboardOptions = KeyboardOptions.Default.copy(
            imeAction = ImeAction.Done,
        ),
        trailingIcon = {
            IconButton(onClick = {
                textState = textState.copy(
                    text = "",
                )
            }) {
                Icon(
                    imageVector = Icons.Default.Close,
                    contentDescription = "Visibility"
                )
            }
        },
        modifier = Modifier
            .focusRequester(focusRequester)
            .wrapContentHeight(align = Alignment.CenterVertically)
//            .background(Color.White.copy(alpha = 0f)),
            .background(Color.White.copy(alpha = 0.3f)),
        colors = TextFieldDefaults.outlinedTextFieldColors(
            focusedBorderColor = PurpleGrey40,
            unfocusedBorderColor = Pink40
        )
    )
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        textState = textState.copy(
            text = textState.text,
            selection = TextRange(textState.text.length)
        )
    }
}

@Composable
@Preview(showBackground = true)
fun TextFieldPreview() {
    TextInput(
        initialVal = "Enter your answer",
        onSubmit = { Log.v("Overlay.kt", "submitAnswer") }
    )
}

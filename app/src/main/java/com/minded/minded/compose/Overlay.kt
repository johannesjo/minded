import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.compose.FadeInBox
import com.minded.minded.data.Question
import com.minded.minded.data.QuestionCategoryId
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.ui.theme.PastelGreen
import com.minded.minded.ui.theme.PastelRed
import com.minded.minded.ui.theme.PastelYellow

@Composable
fun OverlayBig(
    hideOverlay: () -> Unit = { },
    onSubmitAnswer: (answerTxt: String) -> Unit = { },
    rndQuestion: QuestionForPrompt,
    initialVisible: Boolean = false
) {
    var visible by remember { mutableStateOf(initialVisible) }
    LaunchedEffect(Unit) {
        visible = true
    }

    // TODO make background click work again
    FadeInBox(visible) {
        Text(text = "asd")
        Surface(
//            onClick = {
//                Log.v("SVC", "click BG")
//                hideOverlay()
//            },
        ) {
            Box(
                modifier = Modifier
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                PastelYellow,
                                PastelRed,
                                PastelGreen,
                            )
                        )
                    )
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Replace this with your own Compose UI
                    Text(
                        text = "${rndQuestion.t}?",
                        fontSize = 22.sp,
                        modifier = Modifier
                            .padding(16.dp)
                    )
                    TextInput(initialVal = "${rndQuestion.prompt ?: ""} ", onSubmit = {
                        onSubmitAnswer(it)
                        hideOverlay()
                        Log.v("Overlay.kt", "submitAnswer")
                    })
                }
            }
        }
    }
}

@Composable
fun TextInput(initialVal: String = "", onSubmit: (String) -> Unit = {}) {
    var textState by remember { mutableStateOf(TextFieldValue(initialVal)) }
    val focusRequester = remember { FocusRequester() }

    TextField(
        singleLine = true,
        value = textState,
        onValueChange = { newTextState ->
            textState = newTextState.copy(
                text = newTextState.text,
                selection = TextRange(newTextState.text.length)
            )
        },
        label = { Text("") },
        keyboardActions = KeyboardActions(
            onDone = {
                Log.v("SVC", "DONE")
                focusRequester.requestFocus()
                onSubmit(textState.text)
            }
        ),
        modifier = Modifier
            .focusRequester(focusRequester)
            .wrapContentHeight(align = Alignment.CenterVertically),
    )
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}

@Composable
@Preview(showBackground = true)
fun OverlayBigPreview() {
    val Que = QuestionForPrompt(
        t = "What is the capital of France?",
        prompt = "Enter your answer",
        categoryId = QuestionCategoryId.CalmingThoughts
    )
    OverlayBig(rndQuestion = Que, initialVisible = true);
}

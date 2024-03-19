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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.minded.minded.ui.theme.PastelGreen
import com.minded.minded.ui.theme.PastelRed
import com.minded.minded.ui.theme.PastelYellow

@Composable
fun OverlayBig(hideOverlay: () -> Unit = { }) {

    Surface(
        color = Color.Magenta,
        onClick = {
            Log.v("SVC", "click BG")
            hideOverlay()
        },
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
                    text = "This would be the question?",
                    fontSize = 22.sp,
                    modifier = Modifier
                        .padding(16.dp)
                )
                TextInput()
            }
        }
    }
}

@Composable
fun TextInput(initialVal: String = "", onSubmit: (String) -> Unit = {}) {
    var text by remember { mutableStateOf(initialVal) }
    val focusRequester = remember { FocusRequester() }

    TextField(
        singleLine = true,
        value = text,
        onValueChange = { newText ->
            text = newText
        },
        label = { Text("") },
        keyboardActions = KeyboardActions(
            onDone = {
                Log.v("SVC", "DONE")
                focusRequester.requestFocus()
                onSubmit(text);
            }
        ),
        modifier = Modifier
            .focusRequester(focusRequester)
            .wrapContentHeight(align = Alignment.CenterVertically)
//            .align(Alignment.CenterVertically) // Center align the TextField vertically
        ,
    )
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }
}


@Composable
@Preview(showBackground = true)
fun OverlayBigPreview() {
    OverlayBig()
}

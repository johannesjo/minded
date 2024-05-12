import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.overlay.InteractionWindow
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.overlay.data.SharedOverlayViewModel
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class InteractionWindowJavaScriptInterface(
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val win: InteractionWindow,
    private val ctrlSvc: OverlayControllerService,
) {
    private val sharedPreferences = ctrlSvc.getSharedPreferences("mindedData", Context.MODE_PRIVATE)

    val logTag = "InteractionWindowJavaScriptInterface"

    @JavascriptInterface
    fun onSuccess() {
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY
        )
        GlobalScope.launch {
            delay(1000)
            win.hideWindow()
        }
    }

    @JavascriptInterface
    fun saveString(key: String, value: String) {
        with(sharedPreferences.edit()) {
            putString(key, value)
            apply()
        }
    }

    @JavascriptInterface
    fun retrieveString(key: String): String? {
        return sharedPreferences.getString(key, null)
    }

    @JavascriptInterface
    fun setQuestion(question: QuestionForPrompt) {
        Log.v(logTag, "setQuestion() $question")
//        sharedOverlayViewModel.resetAnswerTxt()
//        OverlayControllerService.showOverlay(
//            ctrlSvc,
//            OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
//        )
//        win.hideWindow()
    }

    @JavascriptInterface
    fun setLittleSunTxt(txt: String) {
        Log.v(logTag, "setLittleSunTxt() $txt")
//        sharedOverlayViewModel.resetAnswerTxt()
//        OverlayControllerService.showOverlay(
//            ctrlSvc,
//            OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
//        )
//        win.hideWindow()
    }

    @JavascriptInterface
    fun onSkip() {
        sharedOverlayViewModel.resetAnswerTxt()
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
        )
        win.hideWindow()
    }

    @JavascriptInterface
    fun closeTabOrApp() {
        win.hideWindow()
    }

    @JavascriptInterface
    fun fadeOutMainFinal() {
        win.hideWindow()
    }
}

import android.content.Context
import android.util.Log
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.minded.minded.overlay.InteractionWindow
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.parseJSONQuestion

class InteractionWindowJavaScriptInterface(
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val win: InteractionWindow,
    private val ctrlSvc: OverlayControllerService,
    private val webView: WebView
) : MainActivityJavaScriptInterface(ctrlSvc) {
    private val sharedPreferences = ctrlSvc.getSharedPreferences("mindedData", Context.MODE_PRIVATE)


    @JavascriptInterface
    fun onSuccessSunTap() {
        Log.v(logTag, "onSuccessSunTap()")
        ctrlSvc.userDrivenClose(isSkipShowSuccessSunAfter = true);
        win.hideWindow()
    }

    @JavascriptInterface
    fun requestFocusAndShowKeyboard() {
        Log.v(logTag, "requestFocusAndShowKeyboard()")
        webView.requestFocus()
        val imm = ctrlSvc.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        imm.showSoftInput(webView, InputMethodManager.SHOW_IMPLICIT)
    }


    @JavascriptInterface
    fun showLittleSun() {
        Log.v(logTag, "showLittleSun()")
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.LITTLE_SUN_OVERLAY
        )
    }

    @JavascriptInterface
    fun onSkip() {
        Log.v(logTag, "onSkip()")
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.LITTLE_SUN_OVERLAY
        )
        win.hideWindow()
    }



    @JavascriptInterface
    fun setQuestion(jsonString: String?) {
        Log.v(logTag, "omQuestionSet() $jsonString")
        val questionForPrompt = parseJSONQuestion(jsonString!!)
        Log.v(logTag, "omQuestionSet() $questionForPrompt")
        sharedOverlayViewModel.updateSharedData(
            questionForPrompt = questionForPrompt,
            // NOTE: that does not work :/
        )
        sharedOverlayViewModel.resetAnswerTxt()
    }

    @JavascriptInterface
    fun unsetQuestion() {
        Log.v(logTag, "unsetQuestion()")
        sharedOverlayViewModel.unsetQuestion()
    }

    @JavascriptInterface
    fun setAnswerTxt(txt: String) {
        Log.v(logTag, "setAnswerTxt() $txt")
        sharedOverlayViewModel.updateSharedData(answerTxt = txt)
    }


    @JavascriptInterface
    fun hideWindow() {
        Log.v(logTag, "hideWindow()")
        win.hideWindow()
    }
}

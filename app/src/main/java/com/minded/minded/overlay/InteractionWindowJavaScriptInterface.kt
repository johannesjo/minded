import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import com.minded.minded.overlay.InteractionWindow
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.parseJSONQuestion
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
    fun onSkip() {
        sharedOverlayViewModel.resetAnswerTxt()
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
        )
        win.hideWindow()
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
    fun omQuestionSet(jsonString: String?) {
        Log.v(logTag, "omQuestionSet() $jsonString")
        val questionForPrompt = parseJSONQuestion(jsonString!!)
        Log.v(logTag, "omQuestionSet() $questionForPrompt")

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
    fun closeTabOrApp() {
        win.hideWindow()
    }

    @JavascriptInterface
    fun fadeOutMainFinal() {
        win.hideWindow()
    }
}

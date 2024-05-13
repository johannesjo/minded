import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import com.minded.minded.overlay.InteractionWindow
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.parseJSONQuestion

class InteractionWindowJavaScriptInterface(
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val win: InteractionWindow,
    private val ctrlSvc: OverlayControllerService,
) {
    private val sharedPreferences = ctrlSvc.getSharedPreferences("mindedData", Context.MODE_PRIVATE)

    val logTag = "InteractionWindowJavaScriptInterface"

    @JavascriptInterface
    fun onSuccessSunTap() {
        Log.v(logTag, "onSuccessSunTap()")
//        OverlayControllerService.showOverlay(
//            ctrlSvc,
//            OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY
//        )
        ctrlSvc.userDrivenClose(isSkipShowSuccessSunAfter = true);
        win.hideWindow()
    }

    @JavascriptInterface
    fun onBeforeSuccessAni() {
        Log.v(logTag, "onBeforeSuccessAni()")
//        ctrlSvc.userDrivenClose(isSkipShowSuccessSunAfter = true);
    }

    @JavascriptInterface
    fun showAfterSun() {
        Log.v(logTag, "onShowAfterSun()")
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
        )
    }

    @JavascriptInterface
    fun onSkip() {
        Log.v(logTag, "onSkip()")
        sharedOverlayViewModel.resetAnswerTxt()
        OverlayControllerService.showOverlay(
            ctrlSvc,
            OverlayControllerService.Companion.OverlayName.AFTER_SUN_OVERLAY
        )
        win.hideWindow()
    }

    @JavascriptInterface
    fun saveString(key: String, value: String) {
        Log.v(logTag, "saveString() $value")
        with(sharedPreferences.edit()) {
            putString(key, value)
            apply()
        }
    }

    @JavascriptInterface
    fun retrieveString(key: String): String? {
        Log.v(logTag, "retrieveString() $key")
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
    fun hideWindow() {
        Log.v(logTag, "hideWindow()")
        win.hideWindow()
    }


    @JavascriptInterface
    fun closeTabOrApp() {
        Log.v(logTag, "closeTabOrApp()")
        win.hideWindow()
    }

    @JavascriptInterface
    fun fadeOutMainFinal() {
        Log.v(logTag, "fadeOutMainFinal()")
        win.hideWindow()
    }
}

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.minded.minded.overlay.InteractionWindow
import com.minded.minded.overlay.OverlayControllerService
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.parseJSONQuestion

class InteractionWindowJavaScriptInterface(
    override val webView: WebView,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val win: InteractionWindow,
    private val ctrlSvc: OverlayControllerService
) : MainActivityJavaScriptInterface(ctrlSvc, webView) {
    @JavascriptInterface
    fun onSuccessSunTap() {
        Log.v(logTag, "onSuccessSunTap()")
        ctrlSvc.userDrivenClose(isSkipShowSuccessSunAfter = true);
        win.hideWindow()
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

    @JavascriptInterface
    fun closeCurrentApp() {
        Log.v(logTag, "closeCurrentApp()")
        ctrlSvc.goToHomeScreen()
        win.hideWindow()
    }

    @JavascriptInterface
    fun triggerHaptic(type: String) {
        Log.v(logTag, "triggerHaptic() $type")
        
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = ctrlSvc.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            ctrlSvc.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        
        if (!vibrator.hasVibrator()) {
            Log.w(logTag, "Device does not support vibration")
            return
        }
        
        val effect = when (type) {
            "light" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(10)
                    return
                }
            }
            "medium" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(20)
                    return
                }
            }
            "heavy" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(50)
                    return
                }
            }
            else -> {
                Log.w(logTag, "Unknown haptic type: $type")
                return
            }
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(effect)
        }
    }
}

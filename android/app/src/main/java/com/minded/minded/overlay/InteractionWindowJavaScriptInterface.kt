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
    fun test() {
        Log.d(logTag, "TEST - JavaScript interface is working!")
    }
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
        Log.v(logTag, "closeCurrentApp() - closing current app and going to home")
        val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
        Log.d(logTag, "closeCurrentApp() - current app is: $currentApp")

        // Go to home screen first so blocked app is hidden before overlay disappears
        ctrlSvc.goToHomeScreen()
        Log.d(logTag, "closeCurrentApp() - home intent sent")

        // Hide overlay after short delay to ensure home screen is visible
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Log.d(logTag, "closeCurrentApp() - hiding window after delay")
            win.hideWindow()
        }, 150)
    }

    @JavascriptInterface
    fun setSessionLimit(seconds: Int) {
        Log.d(logTag, "setSessionLimit($seconds) called from JS interface")
        ctrlSvc.setSessionLimit(seconds)
    }

    private val vibrator: Vibrator by lazy {
        val context = ctrlSvc.applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    @JavascriptInterface
    fun triggerHaptic(type: String) {
        // Offload to background thread to avoid blocking JS thread
        Thread {
            try {
                if (!vibrator.hasVibrator()) {
                    return@Thread
                }
                
                val effect = when (type) {
                    "light" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)
                        } else {
                            @Suppress("DEPRECATION")
                            vibrator.vibrate(30)
                            return@Thread
                        }
                    }
                    "medium" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE)
                        } else {
                            @Suppress("DEPRECATION")
                            vibrator.vibrate(50)
                            return@Thread
                        }
                    }
                    "heavy" -> {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE)
                        } else {
                            @Suppress("DEPRECATION")
                            vibrator.vibrate(300)
                            return@Thread
                        }
                    }
                    else -> {
                        return@Thread
                    }
                }
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(effect)
                }
            } catch (e: Exception) {
                Log.e(logTag, "Failed to trigger haptic feedback", e)
            }
        }.start()
    }
}

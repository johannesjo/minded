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
        
        // Hide the window first to ensure smooth transition
        win.hideWindow()
        Log.d(logTag, "closeCurrentApp() - window hidden")
        
        // Small delay to ensure window is hidden before navigating
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Log.d(logTag, "closeCurrentApp() - calling goToHomeScreen after delay")
            ctrlSvc.goToHomeScreen()
        }, 100)
    }

    @JavascriptInterface
    fun triggerHaptic(type: String) {
        Log.d(logTag, "triggerHaptic() called with type: $type")
        
        try {
            // Try using application context instead of service context
            val context = ctrlSvc.applicationContext
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            
            if (!vibrator.hasVibrator()) {
                Log.w(logTag, "Device does not support vibration")
                return
            }
            
            Log.d(logTag, "Vibrator available, proceeding with haptic feedback")
        
        val effect = when (type) {
            "light" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(30)
                    return
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
                    return
                }
            }
            "heavy" -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK)
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(100)
                    return
                }
            }
            "threshold" -> {
                // More intense single vibration for threshold
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(80)
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
                Log.d(logTag, "Haptic feedback triggered successfully with VibrationEffect")
            }
        } catch (e: Exception) {
            Log.e(logTag, "Failed to trigger haptic feedback with application context", e)
            
            // Fallback: Try with a simple pattern
            try {
                val context = ctrlSvc.applicationContext
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
                
                // Use a simple vibration pattern that should work on all devices
                val duration = when (type) {
                    "light" -> 30L
                    "medium" -> 50L
                    "heavy" -> 100L
                    else -> 50L
                }
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(duration)
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(duration)
                }
                Log.d(logTag, "Haptic feedback triggered with fallback method, duration: $duration")
            } catch (fallbackError: Exception) {
                Log.e(logTag, "Fallback haptic also failed", fallbackError)
            }
        }
    }
}

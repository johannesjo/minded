package com.minded.minded.overlay

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.WindowManager
import android.view.inputmethod.InputMethodManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.minded.minded.BuildConfig
import com.minded.minded.MainActivityJavaScriptInterface
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.SafeAreaInsetsHolder
import com.minded.minded.util.SessionIntent
import com.minded.minded.util.parseJSONQuestion
import org.json.JSONObject

internal data class SessionLimitPayload(
    val seconds: Int,
    val intent: SessionIntent?
)

internal fun parseSessionLimitPayload(payloadJson: String): SessionLimitPayload? {
    val trimmed = payloadJson.trim()
    if (!trimmed.startsWith("{")) {
        return trimmed.toIntOrNull()?.let { SessionLimitPayload(it, null) }
    }

    return try {
        val payload = JSONObject(trimmed)
        val intent = payload.optJSONObject("intent")
            ?.optString("id", "")
            ?.takeIf { it.isNotBlank() }
            ?.let { SessionIntent(it) }

        SessionLimitPayload(payload.getInt("seconds"), intent)
    } catch (_: Exception) {
        null
    }
}

class InteractionWindowJavaScriptInterface(
    override val webView: WebView,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val win: InteractionWindow,
    private val ctrlSvc: OverlayControllerService,
    safeAreaInsets: SafeAreaInsetsHolder = SafeAreaInsetsHolder(),
) : MainActivityJavaScriptInterface(ctrlSvc, webView, safeAreaInsets = safeAreaInsets) {
    
    @JavascriptInterface
    fun test() {
        Log.d(logTag, "TEST - JavaScript interface is working!")
    }

    // The reverse-morph arriving sun has painted at the Little Sun's corner, so
    // the native placeholder disc holding that spot during the WebView load can
    // cross-fade out. Web calls this once, right after the morph sun first paints.
    @JavascriptInterface
    fun onArrivingSunReady() {
        Log.v(logTag, "onArrivingSunReady()")
        win.onArrivingSunReady()
    }
    @JavascriptInterface
    fun onSuccessSunTap() {
        Log.v(logTag, "onSuccessSunTap()")
        ctrlSvc.userDrivenClose(isSkipShowSuccessSunAfter = true);
        win.hideWindow()
    }


    /**
     * Where the native Little Sun bubble will rest (the user's parked drag
     * position, or its default), as the bubble centre in fractions of the
     * display: `{"fracX":..,"fracY":..}`. The departing-sun morph reads this so
     * it glides to the bubble's real spot instead of a fixed corner the bubble
     * no longer rests at. Computed via the same LittleSunPosition geometry the
     * bubble itself uses, so the two can't drift. Returns "" on failure, in
     * which case the web side falls back to the corner.
     */
    @JavascriptInterface
    fun getLittleSunRestCenter(): String {
        return try {
            val wm = ctrlSvc.getSystemService(Context.WINDOW_SERVICE) as WindowManager
            val saved = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
            val (fracX, fracY) =
                LittleSunPosition.restingCenterFractions(ctrlSvc, wm, saved)
            JSONObject()
                .put("fracX", fracX.toDouble())
                .put("fracY", fracY.toDouble())
                .toString()
        } catch (e: Exception) {
            Log.e(logTag, "getLittleSunRestCenter failed", e)
            ""
        }
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
        if (jsonString == null) {
            Log.e(logTag, "setQuestion() received null")
            return
        }
        if (BuildConfig.DEBUG) Log.v(logTag, "setQuestion() $jsonString")
        val questionForPrompt = parseJSONQuestion(jsonString)
        if (BuildConfig.DEBUG) Log.v(logTag, "setQuestion() $questionForPrompt")
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
        if (BuildConfig.DEBUG) Log.v(logTag, "setAnswerTxt() $txt")
        sharedOverlayViewModel.updateSharedData(answerTxt = txt)
    }


    @JavascriptInterface
    fun hideWindow() {
        Log.v(logTag, "hideWindow()")
        win.hideWindow()
    }

    @JavascriptInterface
    fun closeCurrentApp() {
        Log.v(logTag, "closeCurrentApp() - closing current app and going to minded app")
        val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
        Log.d(logTag, "closeCurrentApp() - current app is: $currentApp")

        // Go to minded app so blocked app is hidden before overlay disappears
        ctrlSvc.goToApp()
        Log.d(logTag, "closeCurrentApp() - goToApp intent sent")

        // Hide overlay after a delay. Two purposes: ensure the minded app has
        // surfaced before the overlay disappears (the app intent is async with no
        // reliable callback, so this is a pragmatic tradeoff that also covers
        // slower devices), and let the celebratory "Be proud!" message + warm sky
        // linger a beat longer before we transition away.
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            Log.d(logTag, "closeCurrentApp() - hiding window after delay")
            win.hideWindow()
        }, 1300)
    }

    @JavascriptInterface
    fun setSessionLimit(payloadJson: String) {
        Log.d(logTag, "setSessionLimit($payloadJson) called from JS interface")
        val payload = parseSessionLimitPayload(payloadJson)
        if (payload == null) {
            Log.e(logTag, "setSessionLimit - invalid payload: $payloadJson")
            return
        }
        ctrlSvc.setSessionLimit(payload.seconds, payload.intent)
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

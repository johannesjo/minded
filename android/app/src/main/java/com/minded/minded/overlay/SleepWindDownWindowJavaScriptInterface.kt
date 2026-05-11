package com.minded.minded.overlay

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.minded.minded.MainActivityJavaScriptInterface
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.SafeAreaInsetsHolder

/**
 * JavaScript bridge for [SleepWindDownOverlayWindow]. Smaller than the
 * interaction overlay's interface — wind-down has no question/sun-tap flow,
 * just the option to close the blocked app or hide the overlay. Inherits
 * the standard data + insets methods from [MainActivityJavaScriptInterface].
 */
class SleepWindDownWindowJavaScriptInterface(
    override val webView: WebView,
    @Suppress("unused") private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val win: SleepWindDownOverlayWindow,
    private val ctrlSvc: OverlayControllerService,
    safeAreaInsets: SafeAreaInsetsHolder = SafeAreaInsetsHolder(),
) : MainActivityJavaScriptInterface(ctrlSvc, webView, safeAreaInsets = safeAreaInsets) {

    @JavascriptInterface
    fun hideWindow() {
        Log.v(logTag, "hideWindow()")
        win.hideWindow()
    }

    @JavascriptInterface
    fun snoozeWindDown(seconds: Int) {
        Log.d(logTag, "snoozeWindDown($seconds)")
        ctrlSvc.snoozeWindDown(seconds)
    }

    @JavascriptInterface
    fun closeCurrentApp() {
        Log.v(logTag, "closeCurrentApp() - leaving blocked app for minded")
        ctrlSvc.goToApp()
        // Match InteractionWindow's 300ms delay so the user doesn't briefly
        // see the blocked app underneath while goToApp is dispatched.
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            win.hideWindow()
        }, 300)
    }

    /**
     * Locks the device screen via the accessibility service's
     * GLOBAL_ACTION_LOCK_SCREEN. Used when the user completes the wind-down
     * gesture (drag/fling the moon down) — at that point they're putting the
     * phone down to sleep, so locking immediately is the right behavior.
     */
    @JavascriptInterface
    fun lockScreen() {
        Log.v(logTag, "lockScreen() - completing wind-down")
        val intent = Intent("com.minded.ACTION_LOCK_SCREEN").apply {
            setPackage(ctrlSvc.packageName)
        }
        ctrlSvc.sendBroadcast(intent)
    }

    private val vibrator: Vibrator by lazy {
        val context = ctrlSvc.applicationContext
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager =
                context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    @JavascriptInterface
    fun triggerHaptic(type: String) {
        Thread {
            try {
                if (!vibrator.hasVibrator()) return@Thread
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
                    else -> return@Thread
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

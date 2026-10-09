package com.minded.minded.util

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log

/**
 * The one place that turns a semantic haptic name into an actual vibration,
 * shared by every native surface so they all *feel* the same as the WebView sun.
 *
 * The WebView sun (Sun.tsx) fires haptics through `window.androidMinded
 * .triggerHaptic(type)`, which lands on the real [Vibrator] service. Native
 * surfaces used to reach for [android.view.View.performHapticFeedback] instead,
 * which on a `TYPE_APPLICATION_OVERLAY` / `FLAG_NOT_FOCUSABLE` window is
 * unreliable and respects a different system setting - so the little sun's
 * drag-down never matched the WebView sun's touch. Routing both through this
 * helper keeps the tactile language identical.
 *
 * Types mirror the web `triggerHaptic` util exactly:
 *  - `light`  - a faint tick (30ms one-shot).
 *  - `medium` - a crisp click (predefined EFFECT_CLICK where available).
 *  - `heavy`  - a firm click (predefined EFFECT_HEAVY_CLICK where available).
 */
object Haptics {
    private const val LOG_TAG = "Haptics"

    private fun vibrator(context: Context): Vibrator {
        val appContext = context.applicationContext
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager =
                appContext.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            appContext.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
    }

    /** Fire a single haptic. Runs off the caller's thread so it never blocks. */
    fun trigger(context: Context, type: String) {
        val appContext = context.applicationContext
        // Offload to a background thread so a gesture callback never blocks on it.
        // Resolving the Vibrator lives inside the try so a service/cast failure is
        // logged here rather than thrown at the gesture/JS caller.
        Thread {
            try {
                val vibrator = vibrator(appContext)
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
                    else -> return@Thread
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(effect)
                }
            } catch (e: Exception) {
                Log.e(LOG_TAG, "Failed to trigger haptic feedback", e)
            }
        }.start()
    }

    /**
     * The faintest haptic minded plays: one system tick ([VibrationEffect.EFFECT_TICK],
     * the effect behind [android.view.HapticFeedbackConstants.CLOCK_TICK]) as the
     * WebView sun is caught under the finger.
     *
     * It is touch feedback, so it follows the system touch-feedback switch: skipped
     * outright when the user turned it off, and on API 33+ tagged
     * [VibrationAttributes.USAGE_TOUCH] so the platform applies its own touch
     * intensity setting too. Uses the existing VIBRATE permission - nothing new.
     * (View.performHapticFeedback would need no permission at all, but it is
     * unreliable on the overlay windows the intervention sun lives in - see the
     * class comment.)
     */
    fun triggerTick(context: Context) {
        val appContext = context.applicationContext
        Thread {
            try {
                if (!isTouchFeedbackEnabled(appContext)) return@Thread
                val vibrator = vibrator(appContext)
                if (!vibrator.hasVibrator()) return@Thread
                val tick = VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    vibrator.vibrate(
                        tick,
                        VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH),
                    )
                } else {
                    vibrator.vibrate(tick)
                }
            } catch (e: Exception) {
                Log.e(LOG_TAG, "Failed to trigger soft tick", e)
            }
        }.start()
    }

    // The system-wide touch-feedback switch. (Deprecated on newer SDKs in favour
    // of USAGE_TOUCH alone, which we also set there; still honoured, and the only
    // signal on API 29-32.)
    @Suppress("DEPRECATION")
    private fun isTouchFeedbackEnabled(context: Context): Boolean =
        Settings.System.getInt(
            context.contentResolver,
            Settings.System.HAPTIC_FEEDBACK_ENABLED,
            1,
        ) != 0

    /**
     * The satisfying completion pattern - a firm click, then a faint tail - that
     * the WebView sun plays when a drag completes (web `triggerHapticPattern`).
     */
    fun triggerCompletion(context: Context) {
        trigger(context, "heavy")
        Handler(Looper.getMainLooper()).postDelayed({ trigger(context, "light") }, 50)
    }
}

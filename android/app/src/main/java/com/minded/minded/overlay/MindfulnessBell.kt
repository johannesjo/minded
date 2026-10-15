package com.minded.minded.overlay

import android.app.KeyguardManager
import android.app.NotificationManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import com.minded.minded.R
import com.minded.minded.data.SharedPreferenceService
import com.minded.minded.sleepwinddown.SleepWindDownWindow
import com.minded.minded.util.BellVoice
import com.minded.minded.util.ForegroundAppResult
import com.minded.minded.util.ForegroundStateHolder
import com.minded.minded.util.Haptics
import com.minded.minded.util.MindfulnessBellSchedule
import com.minded.minded.util.bellVoice
import com.minded.minded.util.getForegroundAppReliable
import com.minded.minded.widget.MyAppWidgetReceiver
import java.time.LocalDateTime

/**
 * The mindfulness bell (#298): once or twice a day, triggered by nothing the
 * user did, the sun rings over whatever they're doing. It is opt-in (off by
 * default) because it is the one surface that reaches for the user unprompted
 * - every other overlay answers an app they chose to guard. What keeps that
 * acceptable is that it is asked for, rare, wordless, and that it stays away
 * whenever the moment is wrong. Each check below is one of those moments.
 *
 * [onUnlock] is the only entry point: the bell rides an unlock (USER_PRESENT),
 * so it never wakes the phone, needs no alarm or notification, and never
 * reaches into a pocket. When the schedule says no, or the moment is wrong,
 * nothing happens and nothing is recorded; a slot whose window passes without
 * a good moment is simply dropped.
 */
class MindfulnessBell(
    private val context: Context,
    private val prefs: SharedPreferenceService,
) {
    private val logTag = "MindfulnessBell"
    private var player: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())

    /**
     * Decide at an unlock whether to ring. [isAnyOverlayShown] guards the
     * one-sun rule: never while the Little Sun, an intervention, or any other
     * minded surface is up. [isBlockedPackage] keeps the bell off guarded apps,
     * which belong to the interventions. [show] presents the window, given the
     * strike's decay and the strike callback.
     */
    fun onUnlock(
        isAnyOverlayShown: () -> Boolean,
        isBlockedPackage: (String) -> Boolean,
        show: (decayMs: Int, onStrike: () -> Unit, onGone: () -> Unit) -> Unit,
    ) {
        // The schedule first: it only reads a few small prefs, so the common
        // unlock - nothing due - never parses the whole sync blob.
        val now = LocalDateTime.now()
        val epochDay = now.toLocalDate().toEpochDay()
        val minute = now.hour * 60 + now.minute
        val slots = MindfulnessBellSchedule.slotsFor(epochDay, prefs.getMindfulnessBellSalt())
        val (rungMask, lastRung) = prefs.getMindfulnessBellDay(epochDay)
        val slot = MindfulnessBellSchedule.dueSlot(minute, slots, rungMask, lastRung) ?: return

        val syncData = prefs.getSyncData()
        if (syncData.cfg.mindfulnessBell != true) return

        val skipReason = skipReason(syncData.cfg, isAnyOverlayShown, isBlockedPackage)
        if (skipReason != null) {
            // The slot stays open - a later unlock inside its window may still ring.
            Log.d(logTag, "Bell due (slot $slot) but skipped: $skipReason")
            return
        }

        prefs.markMindfulnessBellRung(epochDay, slot, minute)
        val voice = currentVoice(syncData.cfg.soundEnabled != false)
        val sound = if (voice == BellVoice.SOUND) prepareSound() else null
        val decayMs = sound?.duration?.takeIf { it > 0 } ?: BellSunWindow.DEFAULT_DECAY_MS
        Log.d(logTag, "Ringing the bell (slot $slot, voice=$voice)")
        show(
            decayMs,
            {
                when {
                    // Only the live player: a screen-off may have freed it.
                    sound != null && player === sound -> startSafely(sound)
                    voice == BellVoice.VIBRATION -> Haptics.triggerBell(context)
                }
            },
            {
                // Let a strike that already sounded ring out to its end (it
                // releases itself on completion); free one that never played -
                // the sun was taken over or tapped away before the strike.
                if (sound != null && player === sound && !sound.isPlaying) release()
            },
        )
    }

    private fun startSafely(mp: MediaPlayer) {
        try {
            mp.start()
        } catch (e: IllegalStateException) {
            Log.e(logTag, "Bell strike failed", e)
            release()
        }
    }

    /**
     * Another minded surface took over mid-ring: let the strike fade out over a
     * moment rather than ringing on over a pause - or cutting off mid-tone.
     */
    fun fadeOutAndRelease() {
        val mp = player ?: return
        val steps = 10
        var step = 0
        val tick = object : Runnable {
            override fun run() {
                if (player !== mp) return
                step++
                val volume = 1f - step.toFloat() / steps
                try {
                    mp.setVolume(volume, volume)
                } catch (e: IllegalStateException) {
                    release()
                    return
                }
                if (step < steps) handler.postDelayed(this, TAKEOVER_FADE_MS / steps) else release()
            }
        }
        handler.post(tick)
    }

    /** Stop and free a ringing bell, e.g. when the screen goes off mid-ring. */
    fun release() {
        player?.let {
            try {
                it.release()
            } catch (e: Exception) {
                Log.e(logTag, "Failed to release bell player", e)
            }
        }
        player = null
    }

    private fun skipReason(
        cfg: com.minded.minded.util.UserCfg,
        isAnyOverlayShown: () -> Boolean,
        isBlockedPackage: (String) -> Boolean,
    ): String? {
        if (isAnyOverlayShown()) return "a minded surface is showing"

        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val keyguard = context.getSystemService(KeyguardManager::class.java)
        if (!power.isInteractive || keyguard?.isKeyguardLocked == true) return "not unlocked"

        // Bedtime belongs to the wind-down.
        if (SleepWindDownWindow.resolveNightId(cfg) != null) return "bedtime window"

        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (audio.isMusicActive) return "media is playing"
        when (audio.mode) {
            AudioManager.MODE_IN_CALL,
            AudioManager.MODE_IN_COMMUNICATION,
            AudioManager.MODE_RINGTONE -> return "in a call"
        }

        val foreground = when (val r = getForegroundAppReliable(context, lookbackMs = LOOKBACK_MS, staleThresholdMs = LOOKBACK_MS)) {
            is ForegroundAppResult.Success -> r.packageName
            is ForegroundAppResult.Stale -> r.packageName
            // No usage-history read: fall back to the accessibility detector's
            // freshest focus, if it has one.
            else -> ForegroundStateHolder.current()?.packageName
                ?: return "foreground app unknown"
        }
        if (foreground == context.packageName) return "minded is open"
        if (isBlockedPackage(foreground)) return "a guarded app is open"
        // The companion widget may be on the home screen - two suns.
        if (foreground == homePackage() && isWidgetPlaced()) return "home screen with the sun widget"
        return null
    }

    private fun currentVoice(soundEnabled: Boolean): BellVoice {
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val nm = context.getSystemService(NotificationManager::class.java)
        return bellVoice(
            soundEnabled = soundEnabled,
            ringerNormal = audio.ringerMode == AudioManager.RINGER_MODE_NORMAL,
            ringerVibrate = audio.ringerMode == AudioManager.RINGER_MODE_VIBRATE,
            doNotDisturb = nm != null &&
                nm.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL,
            mediaVolume = audio.getStreamVolume(AudioManager.STREAM_MUSIC),
        )
    }

    /** A prepared player for the strike, or null if it can't be loaded. */
    private fun prepareSound(): MediaPlayer? {
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        release()
        return try {
            MediaPlayer.create(
                context,
                R.raw.single_bell,
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
                audio.generateAudioSessionId(),
            )?.also { mp ->
                mp.setOnCompletionListener { release() }
                player = mp
            }
        } catch (e: Exception) {
            Log.e(logTag, "Failed to prepare bell sound", e)
            null
        }
    }

    private fun homePackage(): String? = try {
        context.packageManager.resolveActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
            PackageManager.MATCH_DEFAULT_ONLY,
        )?.activityInfo?.packageName
    } catch (e: Exception) {
        null
    }

    private fun isWidgetPlaced(): Boolean = try {
        AppWidgetManager.getInstance(context)
            .getAppWidgetIds(ComponentName(context, MyAppWidgetReceiver::class.java))
            .isNotEmpty()
    } catch (e: Exception) {
        // Unknown: assume it might be there rather than risk two suns.
        true
    }

    companion object {
        // Whatever resumed last is still in front after an unlock, however long
        // ago it opened - so look back generously and accept an old read.
        private const val LOOKBACK_MS = 30 * 60 * 1000L
        private const val TAKEOVER_FADE_MS = 400L
    }
}

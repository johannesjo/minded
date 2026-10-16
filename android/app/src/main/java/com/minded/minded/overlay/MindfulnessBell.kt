package com.minded.minded.overlay

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Rect
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import com.minded.minded.MyAccessibilityService
import com.minded.minded.R
import com.minded.minded.data.SharedPreferenceService
import com.minded.minded.sleepwinddown.SleepWindDownWindow
import com.minded.minded.util.BellVoice
import com.minded.minded.util.ForegroundAppResult
import com.minded.minded.util.Haptics
import com.minded.minded.util.MindfulnessBellSchedule
import com.minded.minded.util.UserCfg
import com.minded.minded.util.bellVoice
import com.minded.minded.util.getForegroundAppReliable
import org.json.JSONObject
import java.time.LocalDateTime
import java.time.ZoneId
import kotlin.math.abs

/**
 * The mindfulness bell (#298): a few times a day (the user picks how
 * many), triggered by nothing the user did, the sun rings over whatever
 * they're doing. It is opt-in (off by
 * default) because it is the one surface that reaches for the user unprompted
 * - every other overlay answers an app they chose to guard. What keeps that
 * acceptable is that it is asked for, rare, wordless, and that it stays away
 * whenever the moment is wrong. Each check below is one of those moments.
 *
 * [onUnlock] is the only entry point: the bell rides an unlock (USER_PRESENT),
 * so it never wakes the phone, needs no alarm or notification, and never
 * reaches into a pocket. When the schedule says no, or the moment is wrong,
 * nothing happens - only the last due bell's outcome is kept, so the settings
 * can say why one wasn't heard; a slot whose window passes without a good
 * moment is simply dropped. Every unlock is kept too (just the last one), so
 * the settings can tell an unlock that never reached the bell from one that
 * simply fell outside a bell's window.
 */
class MindfulnessBell(
    private val context: Context,
    private val prefs: SharedPreferenceService,
) {
    private val logTag = "MindfulnessBell"
    private var player: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())

    /**
     * Decide at an unlock whether to ring. [isOtherOverlayShown] guards the
     * one-sun rule: never while an intervention or any other minded surface
     * is up. [littleSun] is the Little Sun, if it's showing: then the bell
     * rings *through* it rather than bringing a second sun - as it does through
     * the home-screen widget's sun when that's in view. [isBlockedPackage]
     * keeps the bell off guarded apps, which belong to the interventions (unless
     * the Little Sun is already there with the user). [show] presents the
     * window, given the sun it rings through (null: its own), the strike's
     * decay, the strike callback, and a callback for when it's gone.
     */
    fun onUnlock(
        isOtherOverlayShown: () -> Boolean,
        littleSun: () -> BellHost?,
        isBlockedPackage: (String) -> Boolean,
        show: (host: BellHost?, decayMs: Int, onStrike: () -> Unit, onGone: () -> Unit) -> Unit,
    ) {
        // Most unlocks have nothing due: the cfg is cached (see currentCfg), so
        // they never parse the sync blob, and a bell that's off stops here.
        val cfg = currentCfg()
        if (cfg.mindfulnessBell != true) {
            recordUnlock(enabled = false, nextAtMs = null)
            return
        }
        val now = LocalDateTime.now()
        val epochDay = now.toLocalDate().toEpochDay()
        val minute = now.hour * 60 + now.minute
        val (rungMask, lastRung) = prefs.getMindfulnessBellDay(epochDay)
        val slots = MindfulnessBellSchedule.slotsFor(
            epochDay,
            prefs.getMindfulnessBellSalt(),
            cfg.mindfulnessBellPerDay ?: MindfulnessBellSchedule.DEFAULT_SLOTS_PER_DAY,
        )
        val next = MindfulnessBellSchedule.nextWindowMinute(minute, slots, rungMask)
        recordUnlock(
            enabled = true,
            nextAtMs = next?.let {
                now.toLocalDate().atStartOfDay(ZoneId.systemDefault())
                    .plusMinutes(it.toLong()).toInstant().toEpochMilli()
            },
        )
        val slot = MindfulnessBellSchedule.dueSlot(minute, slots, rungMask, lastRung) ?: return

        val moment = moment(cfg, isOtherOverlayShown, littleSun, isBlockedPackage)
        recordCheck(moment)
        if (moment is Moment.Skip) {
            // The slot stays open - a later unlock inside its window may still ring.
            Log.d(logTag, "Bell due (slot $slot) but skipped: ${moment.reason}")
            return
        }
        val host = (moment as Moment.Ring).host

        prefs.markMindfulnessBellRung(epochDay, slot, minute)
        val voice = currentVoice(cfg.soundEnabled != false)
        val sound = if (voice == BellVoice.SOUND) prepareSound() else null
        val decayMs = sound?.duration?.takeIf { it > 0 } ?: BellSunWindow.DEFAULT_DECAY_MS
        Log.d(logTag, "Ringing the bell (slot $slot, voice=$voice, host=${host?.kind})")
        show(
            host,
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

    /** Whether a due bell rings - and through which sun - or why it stays quiet. */
    private sealed class Moment {
        class Ring(val host: BellHost?) : Moment()
        class Skip(val reason: String) : Moment()
    }

    /** Keep the outcome of a due bell for the settings' "last bell" line. */
    private fun recordCheck(moment: Moment) {
        try {
            val through = when ((moment as? Moment.Ring)?.host?.kind) {
                BellHost.Kind.LITTLE_SUN -> "the Little Sun"
                BellHost.Kind.WIDGET -> "the sun widget"
                null -> null
            }
            prefs.setMindfulnessBellLastCheck(
                JSONObject()
                    .put("atMs", System.currentTimeMillis())
                    .put("rang", moment is Moment.Ring)
                    .put("reason", (moment as? Moment.Skip)?.reason ?: JSONObject.NULL)
                    .put("through", through ?: JSONObject.NULL)
                    .toString(),
            )
        } catch (e: Exception) {
            Log.e(logTag, "Failed to record bell check", e)
        }
    }

    /** Keep every unlock the bell saw, so the settings can tell "never reached" from "not due". */
    private fun recordUnlock(enabled: Boolean, nextAtMs: Long?) {
        try {
            prefs.setMindfulnessBellLastUnlock(
                JSONObject()
                    .put("atMs", System.currentTimeMillis())
                    .put("enabled", enabled)
                    .put("nextAtMs", nextAtMs ?: JSONObject.NULL)
                    .toString(),
            )
        } catch (e: Exception) {
            Log.e(logTag, "Failed to record bell unlock", e)
        }
    }

    private var cachedRaw: String? = null
    private var cachedCfg: UserCfg? = null

    /**
     * The user's cfg, parsed only when the stored blob changed. SharedPreferences
     * hands back the same String instance until the next save, so identity is
     * a free "unchanged" check.
     */
    private fun currentCfg(): UserCfg {
        val raw = prefs.retrieveDataString()
        cachedCfg?.let { if (raw === cachedRaw) return it }
        return prefs.getSyncData().cfg.also {
            cachedRaw = raw
            cachedCfg = it
        }
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

    private fun moment(
        cfg: UserCfg,
        isOtherOverlayShown: () -> Boolean,
        littleSun: () -> BellHost?,
        isBlockedPackage: (String) -> Boolean,
    ): Moment {
        val reason = skipReason(cfg, isOtherOverlayShown)
        if (reason != null) return Moment.Skip(reason)

        // The Little Sun is already with the user (over the app they chose to
        // stay in): it becomes the bell - no second sun, and no guarded-app
        // "no", since nothing here interrupts that choice.
        littleSun()?.let { return Moment.Ring(it) }

        // The accessibility service's live focused window first: it is always
        // there when minded runs, while usage access is optional - relying on
        // it alone silenced the bell for everyone who skipped that permission.
        val foreground = MyAccessibilityService.focusedAppWindowPackage()
            ?: when (val r = getForegroundAppReliable(context, lookbackMs = LOOKBACK_MS, staleThresholdMs = LOOKBACK_MS)) {
                is ForegroundAppResult.Success -> r.packageName
                is ForegroundAppResult.Stale -> r.packageName
                // Unknown is a "no": a wrong guess here rings over minded
                // itself or a guarded app.
                else -> return Moment.Skip("couldn't tell which app was open")
            }
        if (foreground == context.packageName) return Moment.Skip("minded was open")
        if (isBlockedPackage(foreground)) return Moment.Skip("a guarded app was open")
        if (foreground != homePackage()) return Moment.Ring(null)

        // On the home screen the companion widget's sun, if it's in view, is
        // the bell: it rings through that sun rather than beside it. Unreadable
        // stays quiet - a guess could put a second sun next to it.
        val widgetSuns = visibleWidgetSuns() ?: return Moment.Skip("couldn't read the home screen")
        val sun = widgetSuns.firstOrNull() ?: return Moment.Ring(null)
        // Bounds come clipped to the screen: a lopsided box is a widget half
        // swiped away, whose centre and size would be wrong - and it's leaving.
        if (abs(sun.width() - sun.height()) > maxOf(sun.width(), sun.height()) / 5) {
            return Moment.Skip("the sun widget was only partly in view")
        }
        return Moment.Ring(
            BellHost(sun.centerX(), sun.centerY(), minOf(sun.width(), sun.height()), BellHost.Kind.WIDGET),
        )
    }

    /** The moments that are wrong for any bell, wherever it would ring. */
    private fun skipReason(cfg: UserCfg, isOtherOverlayShown: () -> Boolean): String? {
        if (isOtherOverlayShown()) return "another minded surface was showing"

        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val keyguard = context.getSystemService(KeyguardManager::class.java)
        if (!power.isInteractive || keyguard?.isKeyguardLocked == true) return "the phone was locked again"

        // Bedtime belongs to the wind-down.
        if (SleepWindDownWindow.resolveNightId(cfg) != null) return "bedtime wind-down"

        // Do Not Disturb is an explicit "not now" - for the light as much as
        // the sound.
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm != null && nm.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL) {
            return "do not disturb"
        }

        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (audio.isMusicActive) return "media was playing"
        when (audio.mode) {
            AudioManager.MODE_IN_CALL,
            AudioManager.MODE_IN_COMMUNICATION,
            AudioManager.MODE_RINGTONE -> return "a call"
        }
        return null
    }

    private fun currentVoice(soundEnabled: Boolean): BellVoice {
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        return bellVoice(
            soundEnabled = soundEnabled,
            ringerNormal = audio.ringerMode == AudioManager.RINGER_MODE_NORMAL,
            ringerVibrate = audio.ringerMode == AudioManager.RINGER_MODE_VIBRATE,
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

    internal fun homePackage(): String? = try {
        context.packageManager.resolveActivity(
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME),
            PackageManager.MATCH_DEFAULT_ONLY,
        )?.activityInfo?.packageName
    } catch (e: Exception) {
        null
    }

    /** Where the widget's sun is visible now, found by its content description; null if unreadable. */
    private fun visibleWidgetSuns(): List<Rect>? =
        MyAccessibilityService.visibleDescribedNodeBounds(
            listOf(
                R.string.widget_sun_description_day,
                R.string.widget_sun_description_night,
            ).map { context.getString(it) },
        )

    companion object {
        // Whatever resumed last is still in front after an unlock, however long
        // ago it opened - so look back generously and accept an old read.
        private const val LOOKBACK_MS = 30 * 60 * 1000L
        private const val TAKEOVER_FADE_MS = 400L
    }
}

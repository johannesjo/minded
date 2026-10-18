package com.minded.minded.overlay

import android.app.KeyguardManager
import android.content.Context
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.View
import android.view.WindowManager
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.LittleSun
import com.minded.minded.ui.compose.LittleSunLeaveZone
import com.minded.minded.ui.compose.MINI_MORPH_MS
import com.minded.minded.util.ForegroundAppResult
import com.minded.minded.util.Haptics
import com.minded.minded.util.getForegroundAppReliable
import com.minded.minded.util.shouldHandBackToPause
import com.minded.minded.util.unlockedSessionAfterTick
import java.time.Instant
import kotlin.math.hypot
import kotlin.math.roundToInt

//val SMALL_MSG_CYCLE_DURATION = 6

val SMALL_MSG_CYCLE_DURATION = 240
val REQUESTION_CYCLE_DURATION_IN_S = SMALL_MSG_CYCLE_DURATION * 10

private const val REVALIDATION_GRACE_PERIOD_MS = 3000L

@Suppress("DEPRECATION")
class LittleSunWindow(
    private val ctrlSvc: OverlayControllerService,
    private val sharedOverlayViewModel: SharedOverlayViewModel,
    private val windowManager: WindowManager,
) : CommonWindow(ctrlSvc, sharedOverlayViewModel, windowManager) {

    override val logTag = javaClass.simpleName
    private var initialTime = 0
    private var windowShownAt = 0L
    private var pendingExpiredApp: String? = null
    private var pendingExpiredWasWindDownSnooze = false

    /**
     * Set by the controller for every show: hand back to the full pause once
     * the session reaches this many seconds (a "later" week from the skip
     * check-in), or null for a plain bubble. Snapshotted when the bubble
     * actually appears, so a duplicate show request can't rewrite a live one.
     */
    var pauseAtSessionS: Int? = null
    private var activePauseAtSessionS: Int? = null

    // Session seconds toward that hand-back, counted only while the screen is
    // on and unlocked: a locked phone never "stays a while", so nobody unlocks
    // straight into a pause. Seeded from, and written back to, the app's entry
    // so the next open's decision counts the same unlocked time.
    private var unlockedSessionS = 0
    private val powerManager: PowerManager =
        ctrlSvc.getSystemService(Context.POWER_SERVICE) as PowerManager
    private val keyguardManager: KeyguardManager? =
        ctrlSvc.getSystemService(KeyguardManager::class.java)

    // Current resting position of the bubble (top-left gravity, pixels). Drag
    // mutates these; on release the bubble simply rests wherever it was dropped
    // (clamped on-screen), so it can be parked anywhere, not just at the edges.
    private var posX = 0
    private var posY = 0

    // The finger's unclamped position during a drag: posX/posY are clamped
    // on-screen every step, so the raw pair is where the disc would be if the
    // finger alone decided. The leave-zone capture test reads this (not the
    // clamped window position) so the magnet answers to the finger directly.
    private var rawX = 0f
    private var rawY = 0f

    // ---- Mini size (double tap) -------------------------------------------
    // Only the disc eases between sizes (in Compose); the window keeps its
    // full size, so the sun shrinks and grows in place without the window
    // ever moving under it (see LittleSunPosition.bubbleSizePx).
    private var isMini by mutableStateOf(false)

    // The bubble's live, eased disc scale - shared with the leave zone so a
    // capture mid-shrink snaps the disc at the size it actually is.
    private var liveDiscScale by mutableStateOf(1f)

    // ---- Leave zone ("horizon") state -----------------------------------
    // A second, non-touchable overlay shown only while the bubble is being
    // dragged: the visible trigger area for the step-away. Compose state so
    // both windows' composables react live.
    private var zoneView: ComposeView? = null
    private var isDiscInZone by mutableStateOf(false)
    private var isLeaveCommitted by mutableStateOf(false)
    private var zoneFingerCenter by mutableStateOf(Offset.Zero)
    private var zoneMagnetCenter by mutableStateOf(Offset.Zero)

    // Zone geometry in display coordinates, resolved at drag start (insets can
    // change between drags, e.g. after a rotation).
    private var magnetCenterX = 0
    private var magnetCenterY = 0
    private var magnetCaptureRadiusPx = 0
    private var zoneTopY = 0

    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            val initialTime = sharedOverlayViewModel.getCurrentAppDuration()
            startTimer(initialTime)
        }

        val discScale by animateFloatAsState(
            targetValue = if (isMini) LittleSunPosition.MINI_SCALE else 1f,
            animationSpec = tween(durationMillis = MINI_MORPH_MS),
            label = "littleSunMiniScale",
        )
        SideEffect { liveDiscScale = discScale }

        LittleSun(
            elapsedSeconds = elapsedSeconds,
            discHidden = isDiscInZone,
            discScale = discScale,
            onDoubleTap = { toggleMini() },
            onDragStart = { onDragStart() },
            onDrag = { dx, dy -> onDrag(dx, dy) },
            onDragEnd = { onDragEnd() },
        )
    }

    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
            val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
            val activeTimer = sharedOverlayViewModel.sharedData.value.activeTimer
            val appEntry = if (currentApp != null) sharedOverlayViewModel.sharedData.value.appMap[currentApp] else null
            val windDownSnoozeEndTime = ctrlSvc.getWindDownSnoozeTimerEndTime()
            
            val endTime = windDownSnoozeEndTime
                ?: activeTimer?.let { Instant.ofEpochMilli(it.endTS) }
                ?: appEntry?.sessionEndTime
            val now = Instant.now()

            Log.v(
                logTag,
                "elapsedSeconds: $elapsedSeconds ${powerManager.isScreenOn} ${powerManager.isInteractive}"
            )

            if (endTime != null) {
                if (now.isAfter(endTime)) {
                    // Time limit reached
                    if (currentApp != null) {
                        pendingExpiredApp = currentApp
                        pendingExpiredWasWindDownSnooze = windDownSnoozeEndTime != null
                    }
                    // Resting bubble → intervention hand-off: drop the bubble
                    // instantly (no 300ms fade) so the intervention's shield covers
                    // the corner ~300ms sooner, with no page-flash before the sun
                    // re-blooms there via the reverse morph. onWindowRemoved still
                    // fires, so the intervention is triggered exactly as before.
                    hideWindowImmediate()
                    stopTimer()
                    return
                } else {
                    val remaining = java.time.Duration.between(now, endTime).seconds.toInt()
                    // If more than 12 hours (e.g. Rest of Day), show count-up timer
                    if (remaining > 12 * 3600) {
                        // Count-up mode for rest-of-day sessions
                        elapsedSeconds++
                        sharedOverlayViewModel.updateCurrentAppSessionDuration(elapsedSeconds)
                    } else {
                        // Countdown mode for timed sessions
                        elapsedSeconds = remaining
                    }
                }
            } else {
                // Regular elapsed time mode (fallback)
                elapsedSeconds++
                val isUnlocked = powerManager.isInteractive &&
                    keyguardManager?.isKeyguardLocked != true
                unlockedSessionS = unlockedSessionAfterTick(unlockedSessionS, isUnlocked)
                sharedOverlayViewModel.updateCurrentAppSessionDuration(
                    elapsedSeconds,
                    unlockedSessionS,
                )

                if (
                    shouldHandBackToPause(activePauseAtSessionS, unlockedSessionS, isUnlocked) &&
                    currentApp != null
                ) {
                    // A "later" week: the user has now stayed a while, so the
                    // bubble hands back to the full pause exactly like a session
                    // timer running out - the sun glides back out of this corner.
                    activePauseAtSessionS = null
                    pendingExpiredApp = currentApp
                    pendingExpiredWasWindDownSnooze = false
                    hideWindowImmediate()
                    stopTimer()
                    return
                }
            }

            // Always continue the timer - OverlayControllerService handles screen state changes
            // via its broadcast receiver. We just skip updates when screen is off.
            if (powerManager.isScreenOn && powerManager.isInteractive) {
                // Normal operation - screen is on and interactive
                // Re-validate that user is still in a blocked app (with grace period)
                val timeSinceShown = System.currentTimeMillis() - windowShownAt
                if (timeSinceShown >= REVALIDATION_GRACE_PERIOD_MS) {
                    val foregroundResult = getForegroundAppReliable(ctrlSvc)
                    when (foregroundResult) {
                        is ForegroundAppResult.Success -> {
                            if (!ctrlSvc.isBlockedPackage(foregroundResult.packageName)) {
                                Log.d(logTag, "Re-validation: user left blocked app (now in ${foregroundResult.packageName}), hiding overlay")
                                hideWindow()
                                return
                            }
                        }
                        // Continue timer for Stale/Error/NoPermission - don't hide on uncertain data
                        else -> {
                            Log.v(logTag, "Re-validation: uncertain result ($foregroundResult), continuing")
                        }
                    }
                } else {
                    Log.v(logTag, "Re-validation: skipping during grace period (${timeSinceShown}ms < ${REVALIDATION_GRACE_PERIOD_MS}ms)")
                }
            } else {
                // Screen off or not interactive - skip this tick but keep timer running
                Log.v(logTag, "Screen off/not interactive, skipping timer tick")
            }

            // Always schedule next tick to keep timer alive
            handler.postDelayed(this, 1000)
        }
    }

    override fun showWindow() {
        Log.d(logTag, "showWindow() called for Little Sun")
        if (!isWindowShown()) {
            // Restore the bubble's parked position.
            initPosition()
            activePauseAtSessionS = pauseAtSessionS
        }
        // A fresh appearance starts at rest - no capture, no committed leave.
        isDiscInZone = false
        isLeaveCommitted = false
        super.showWindow()
        // Make background transparent for the little sun overlay
        window?.setBackgroundColor(0x00000000)
        window?.let { measureWindowOrigin(it) }
        windowShownAt = System.currentTimeMillis()
        Log.d(logTag, "showWindow() completed, window=${window != null}")
    }

    /**
     * The little sun is always a small wrap-content overlay positioned anywhere
     * on screen. It is touchable (so it can be dragged) but NOT full-screen, so
     * the app underneath stays fully interactive - Android only routes touches
     * inside the bubble's own bounds to us, exactly like a chat-head.
     * [FLAG_NOT_FOCUSABLE] keeps it from stealing keyboard focus from the app
     * the user is typing in.
     *
     * The step-away is offered on the bubble itself (drag it into the horizon
     * glow that appears while dragging → the sun sets, minded opens), so there
     * is no full-screen pause to expand into and the app is never blocked.
     */
    override fun getLayoutParams(): WindowManager.LayoutParams {
        val size = LittleSunPosition.bubbleSizePx(ctrlSvc.resources.displayMetrics.density)
        return WindowManager.LayoutParams(
            size,
            size,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            // posX/posY are display coordinates, like all the bubble geometry.
            LittleSunPosition.placeInDisplay(ctrlSvc, windowManager, this, posX, posY)
        }
    }

    // Position geometry (default, clamp, display bounds, gesture insets) lives in
    // LittleSunPosition so the departing-sun morph in the interaction WebView can
    // target the exact same resting spot the bubble will appear at.
    private fun initPosition() {
        val prefs = ctrlSvc.getSharedPreferenceService()
        isMini = prefs.isLittleSunMini()
        val (x, y) = LittleSunPosition.restingTopLeft(
            ctrlSvc,
            windowManager,
            prefs.getLittleSunPosition(),
        )
        posX = x
        posY = y
        rawX = posX.toFloat()
        rawY = posY.toFloat()
    }

    private fun clampPosition() {
        val (x, y) = LittleSunPosition.clamp(ctrlSvc, windowManager, posX, posY)
        posX = x
        posY = y
    }

    private fun savePosition() {
        ctrlSvc.getSharedPreferenceService().saveLittleSunPosition(posX, posY)
    }

    /**
     * Double tap: shrink to the mini sun so it covers less of the app, or grow
     * back. A soft ease in place either way (see [isMini]); remembered, so the
     * sun comes back at the size it was left.
     */
    private fun toggleMini() {
        if (isLeaveCommitted) return
        // The bell's light is sized to the sun it rang through - let it go.
        ctrlSvc.onBellHostLeaving(BellHost.Kind.LITTLE_SUN)
        Haptics.triggerTick(ctrlSvc.applicationContext)
        isMini = !isMini
        ctrlSvc.getSharedPreferenceService().setLittleSunMini(isMini)
    }

    /**
     * Once the bubble's first frame is laid out, check where its window really
     * landed and correct the placement if the estimated origin was off (see
     * LittleSunPosition.placeInDisplay). Runs before the fade-in shows much.
     */
    private fun measureWindowOrigin(v: View) {
        v.addOnLayoutChangeListener(object : View.OnLayoutChangeListener {
            override fun onLayoutChange(
                view: View, l: Int, t: Int, r: Int, b: Int,
                oldL: Int, oldT: Int, oldR: Int, oldB: Int,
            ) {
                view.removeOnLayoutChangeListener(this)
                if (window !== view) return
                val params = view.layoutParams as? WindowManager.LayoutParams ?: return
                val loc = IntArray(2)
                view.getLocationOnScreen(loc)
                if (LittleSunPosition.recordWindowOrigin(ctrlSvc, windowManager, params, loc[0], loc[1])) {
                    updateLayout()
                }
            }
        })
    }

    private fun updateLayout() {
        val w = window ?: return
        try {
            windowManager.updateViewLayout(w, getLayoutParams())
        } catch (e: Exception) {
            Log.e(logTag, "updateViewLayout failed", e)
        }
    }

    /** The bubble as a sun the mindfulness bell can ring through, while it's shown. */
    fun bellHost(): BellHost? {
        if (!isWindowShown()) return null
        val density = ctrlSvc.resources.displayMetrics.density
        val half = LittleSunPosition.bubbleSizePx(density) / 2
        // Rings through the sun as drawn, not its (larger) touch area.
        val size = LittleSunPosition.glowSizePx(density, isMini)
        return BellHost(posX + half, posY + half, size, BellHost.Kind.LITTLE_SUN)
    }

    private fun onDragStart() {
        // A bell ringing through the bubble stays where it rang - let it go
        // rather than leave its light behind as the sun moves.
        ctrlSvc.onBellHostLeaving(BellHost.Kind.LITTLE_SUN)
        // Resolve the zone geometry fresh - insets/orientation may have changed
        // since the last drag.
        val density = ctrlSvc.resources.displayMetrics.density
        val (mx, my) = LittleSunPosition.magnetCenter(ctrlSvc, windowManager)
        magnetCenterX = mx
        magnetCenterY = my
        magnetCaptureRadiusPx = LittleSunPosition.magnetCaptureRadiusPx(density)
        zoneTopY = LittleSunPosition.displayHeightPx(ctrlSvc, windowManager) -
            LittleSunPosition.leaveZoneHeightPx(density)

        isDiscInZone = false
        isLeaveCommitted = false
        zoneMagnetCenter = Offset(
            magnetCenterX.toFloat(),
            (magnetCenterY - zoneTopY).toFloat(),
        )
        updateZoneFingerCenter()
        showZone()
    }

    private fun onDrag(dxPx: Float, dyPx: Float) {
        rawX += dxPx
        rawY += dyPx
        posX = rawX.roundToInt()
        posY = rawY.roundToInt()
        clampPosition()
        updateLayout()

        // Magnet capture answers to the finger (raw, unclamped), so the bottom
        // clamp can never hold the disc just out of the zone's reach.
        updateZoneFingerCenter()
        val bubbleHalf = LittleSunPosition.bubbleSizePx(ctrlSvc.resources.displayMetrics.density) / 2f
        val dist = hypot(
            rawX + bubbleHalf - magnetCenterX,
            rawY + bubbleHalf - magnetCenterY,
        )
        val inZone = dist <= magnetCaptureRadiusPx
        if (inZone != isDiscInZone) {
            isDiscInZone = inZone
            if (inZone) {
                // A crisp click marks the capture - release now and the sun sets.
                // The same real Vibrator "medium" the WebView sun fires when a
                // drag crosses its threshold, so the two suns feel identical
                // (view-level performHapticFeedback was weaker and unreliable on
                // this overlay window).
                Haptics.trigger(ctrlSvc.applicationContext, "medium")
            }
        }
    }

    private fun onDragEnd() {
        if (isLeaveCommitted) return
        if (isDiscInZone) {
            commitLeave()
            return
        }
        // Rest wherever it was dropped - a free-floating companion, parkable
        // anywhere, not edge-locked. clampPosition keeps it on-screen and a
        // margin in from every edge, clear of the system gesture zones.
        clampPosition()
        rawX = posX.toFloat()
        rawY = posY.toFloat()
        savePosition()
        hideZoneFaded()
    }

    private fun updateZoneFingerCenter() {
        // The CLAMPED centre, deliberately: when the magnet lets the disc go,
        // the zone's disc springs back to exactly where the bubble's own disc
        // fades back in (the clamped window position) - one sun, no seam. The
        // capture test above is what reads the raw finger position.
        val bubbleHalf = LittleSunPosition.bubbleSizePx(ctrlSvc.resources.displayMetrics.density) / 2f
        zoneFingerCenter = Offset(
            posX + bubbleHalf,
            posY + bubbleHalf - zoneTopY,
        )
    }

    /**
     * Released inside the zone - the step-away is chosen. Launch minded *now*,
     * behind the still-visible sun, so the app is drawn and ready by the time
     * the sun has set - the calm "redirect" half of interrupt → reflect →
     * redirect, into minded (a calm space) rather than the launcher that
     * re-tempts. Matches the full interaction's close
     * ([OverlayControllerService.goToApp]).
     *
     * Stop the timer so the foreground re-validation tick can't tear the zone
     * down mid-set now that the foreground is minded, not the blocked app. The
     * bubble window itself is already invisible (the zone holds the disc), so
     * it is removed at once; the zone plays the set and then removes itself.
     *
     * Deliberately NOT counted via countUserDrivenClose(): that tally feeds the
     * "set up a daily budget" prompt (5+/day), so logging a calm step-away would
     * manufacture a scarcity nudge out of a healthy outcome - it leaves no tally.
     */
    private fun commitLeave() {
        // The satisfying completion pattern the WebView sun plays on a completed
        // drag (heavy click + faint tail), via the same shared Vibrator path.
        Haptics.triggerCompletion(ctrlSvc.applicationContext)
        stopTimer()
        ctrlSvc.goToApp()
        // Flip BEFORE tearing the bubble window down: hideWindowImmediate keeps
        // its hands off the zone only while a committed set is playing there.
        isLeaveCommitted = true
        // Removing a view from inside its own gesture callback is asking for
        // trouble - let this dispatch finish first.
        handler.post { hideWindowImmediate() }
        // Failsafe: if the zone's composition dies before the set finishes
        // (service teardown mid-animation), onSetComplete never fires - don't
        // leave the glow stranded on screen. Idempotent with the normal path.
        handler.postDelayed({ removeZoneImmediate() }, 2000)
    }

    // ---- Leave zone window management ------------------------------------

    private fun getZoneLayoutParams(): WindowManager.LayoutParams {
        val density = ctrlSvc.resources.displayMetrics.density
        return WindowManager.LayoutParams(
            LittleSunPosition.displayWidthPx(ctrlSvc, windowManager),
            LittleSunPosition.leaveZoneHeightPx(density),
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            // Never touchable: purely a picture; every touch stays with the
            // bubble (which captured the pointer) or the app beneath.
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            // Same display coordinate space as the bubble window, so zone-local
            // positions are display positions minus zoneTopY.
            LittleSunPosition.placeInDisplay(ctrlSvc, windowManager, this, 0, zoneTopY)
        }
    }

    private fun showZone() {
        if (zoneView != null) return
        val v = ComposeView(ctrlSvc).apply {
            setViewTreeLifecycleOwner(ctrlSvc)
            setViewTreeSavedStateRegistryOwner(ctrlSvc)
            setBackgroundColor(0x00000000)
            setContent {
                LittleSunLeaveZone(
                    elapsedSeconds = elapsedSeconds,
                    armed = isDiscInZone,
                    committed = isLeaveCommitted,
                    fingerDiscCenter = zoneFingerCenter,
                    magnetCenter = zoneMagnetCenter,
                    discScale = liveDiscScale,
                    // The sun has fully set and minded is already showing -
                    // remove the spent window at once, no second fade. Posted:
                    // don't remove the view from inside its own composition.
                    onSetComplete = { handler.post { removeZoneImmediate() } },
                )
            }
            alpha = 0f
        }
        try {
            windowManager.addView(v, getZoneLayoutParams())
        } catch (e: Exception) {
            Log.e(logTag, "failed to add leave-zone view", e)
            return
        }
        zoneView = v
        v.animate().alpha(1f).setDuration(300).start()
    }

    /** The drag ended in a plain rest - breathe the horizon back out. */
    private fun hideZoneFaded() {
        val v = zoneView ?: return
        zoneView = null
        v.animate()
            .alpha(0f)
            .setDuration(300)
            .withEndAction {
                try {
                    windowManager.removeView(v)
                } catch (e: Exception) {
                    Log.e(logTag, "failed to remove leave-zone view", e)
                }
            }
            .start()
    }

    private fun removeZoneImmediate() {
        val v = zoneView ?: return
        zoneView = null
        try {
            windowManager.removeView(v)
        } catch (e: Exception) {
            Log.e(logTag, "failed to remove leave-zone view", e)
        }
    }

    override fun hideWindow() {
        ctrlSvc.onBellHostLeaving(BellHost.Kind.LITTLE_SUN)
        stopTimer()
        // A hide can land mid-drag (timer expiry, re-validation) - never leave
        // the horizon glow orphaned on screen. During a committed set the zone
        // outlives the bubble on purpose and removes itself.
        if (!isLeaveCommitted) removeZoneImmediate()
        super.hideWindow()
    }

    override fun hideWindowImmediate() {
        ctrlSvc.onBellHostLeaving(BellHost.Kind.LITTLE_SUN)
        if (!isLeaveCommitted) removeZoneImmediate()
        super.hideWindowImmediate()
    }

    override fun onWindowRemoved() {
        val expiredApp = pendingExpiredApp ?: return
        val wasWindDownSnooze = pendingExpiredWasWindDownSnooze
        pendingExpiredApp = null
        pendingExpiredWasWindDownSnooze = false

        Handler(Looper.getMainLooper()).post {
            ctrlSvc.onLittleSunTimerExpired(expiredApp, wasWindDownSnooze)
        }
    }

    private fun startTimer(initialTimeI: Int = 0) {
        Log.v(logTag, "startTimer(${initialTimeI})")
        initialTime = if (initialTimeI > 0) initialTimeI else 0
        stopTimer()
        elapsedSeconds = initialTime
        unlockedSessionS = sharedOverlayViewModel.getCurrentAppUnlockedSession()
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }
}

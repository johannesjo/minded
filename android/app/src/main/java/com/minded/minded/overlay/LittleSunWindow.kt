package com.minded.minded.overlay

import android.content.Context
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.ui.compose.LittleSun
import com.minded.minded.util.ForegroundAppResult
import com.minded.minded.util.getForegroundAppReliable
import java.time.Instant
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
    private val powerManager: PowerManager =
        ctrlSvc.getSystemService(Context.POWER_SERVICE) as PowerManager

    private val density = ctrlSvc.resources.displayMetrics.density
    private val bubbleSizePx = LittleSunPosition.bubbleSizePx(density)

    // Current resting position of the bubble (top-left gravity, pixels). Drag
    // mutates these; on release the bubble simply rests wherever it was dropped
    // (clamped on-screen), so it can be parked anywhere, not just at the edges.
    private var posX = 0
    private var posY = 0

    // Drives whether the overlay is the small resting bubble or the full-screen
    // pause + step-away invitation. A Compose state so Cmp() recomposes.
    private var isExpanded by mutableStateOf(false)
    // True only when re-showing the resting bubble after the offer collapses, so
    // the bubble waits for the window resize to settle before appearing (then
    // snaps in at the sun's spot, with no entrance of its own — one continuous
    // motion). Reset on a fresh show.
    private var enterWithFade by mutableStateOf(false)
    // The bubble's screen-px centre captured at the moment of tap, so the pause
    // sun can expand out of exactly where the little sun sat.
    private var expandOriginX by mutableStateOf(-1)
    private var expandOriginY by mutableStateOf(-1)
    // Set while leaving via the offer (pull the sun down → step away into minded)
    // so the hide fades the expanded pause sun straight out, instead of flipping
    // back to the little bubble (which would flash on its way out). Cleared once
    // the window is actually removed.
    private var keepExpandedOnHide = false

    @Composable
    override fun Cmp() {
        LaunchedEffect(Unit) {
            val initialTime = sharedOverlayViewModel.getCurrentAppDuration()
            startTimer(initialTime)
        }

        LittleSun(
            elapsedSeconds = elapsedSeconds,
            expanded = isExpanded,
            enterFade = enterWithFade,
            expandFromX = expandOriginX,
            expandFromY = expandOriginY,
            onTap = { expand() },
            onDrag = { dx, dy -> onDrag(dx, dy) },
            onDragEnd = { onDragEnd() },
            onStepAway = { stepAway() },
            onStay = { collapse() },
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
                    hideWindow()
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
                sharedOverlayViewModel.updateCurrentAppSessionDuration(elapsedSeconds)
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
            // Always open as the resting bubble; restore its parked position.
            isExpanded = false
            enterWithFade = false
            initPosition()
        }
        super.showWindow()
        // Make background transparent for the little sun overlay
        window?.setBackgroundColor(0x00000000)
        windowShownAt = System.currentTimeMillis()
        Log.d(logTag, "showWindow() completed, window=${window != null}")
    }

    /**
     * The resting bubble is a small wrap-content overlay positioned anywhere on
     * screen. It is touchable (so it can be dragged and tapped) but NOT
     * full-screen, so the app underneath stays fully interactive — Android only
     * routes touches inside the bubble's own bounds to us, exactly like a
     * chat-head. [FLAG_NOT_FOCUSABLE] keeps it from stealing keyboard focus from
     * the app the user is typing in.
     *
     * When tapped it expands to a full-screen, dimmed pause + invitation; that
     * surface is user-invoked and always auto-dismisses, so the app is never
     * blocked while the bubble is idle.
     */
    override fun getLayoutParams(): WindowManager.LayoutParams {
        return if (isExpanded) expandedLayoutParams() else restingLayoutParams()
    }

    private fun restingLayoutParams(): WindowManager.LayoutParams {
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = posX
            y = posY
        }
    }

    private fun expandedLayoutParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION")
        return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT,
        ).apply {
            x = 0
            y = 0
        }
    }

    // Position geometry (default, clamp, display bounds, gesture insets) lives in
    // LittleSunPosition so the departing-sun morph in the interaction WebView can
    // target the exact same resting spot the bubble will appear at.
    private fun initPosition() {
        val saved = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
        val (x, y) = LittleSunPosition.restingTopLeft(ctrlSvc, windowManager, saved)
        posX = x
        posY = y
    }

    private fun clampPosition() {
        val (x, y) = LittleSunPosition.clamp(ctrlSvc, windowManager, posX, posY)
        posX = x
        posY = y
    }

    private fun updateLayout() {
        val w = window ?: return
        try {
            windowManager.updateViewLayout(w, getLayoutParams())
        } catch (e: Exception) {
            Log.e(logTag, "updateViewLayout failed", e)
        }
    }

    private fun onDrag(dxPx: Float, dyPx: Float) {
        if (isExpanded) return
        posX += dxPx.roundToInt()
        posY += dyPx.roundToInt()
        clampPosition()
        updateLayout()
    }

    private fun onDragEnd() {
        if (isExpanded) return
        // Rest wherever it was dropped — a free-floating companion, parkable
        // anywhere, not edge-locked. clampPosition keeps it on-screen and a
        // margin in from every edge, clear of the system gesture zones.
        clampPosition()
        ctrlSvc.getSharedPreferenceService().saveLittleSunPosition(posX, posY)
    }

    private fun expand() {
        if (isExpanded) return
        // Capture where the bubble sits now so the pause sun expands out of it.
        expandOriginX = posX + bubbleSizePx / 2
        expandOriginY = posY + bubbleSizePx / 2
        isExpanded = true
        updateLayout()
    }

    private fun collapse() {
        if (!isExpanded) return
        // The pause sun has already handed off (reverse glide → quick hide) or sunk
        // off-screen (drag-down) by the time we get here, so the window resize is
        // unseen. Have the resting bubble wait for the resize to settle, then snap
        // in at the sun's spot (no separate entrance) — one continuous motion.
        enterWithFade = true
        isExpanded = false
        clampPosition()
        updateLayout()
    }

    private fun stepAway() {
        // The pull-down has sunk the sun off the bottom; now redirect into minded.
        // Fade the expanded sun straight out — don't revert to the little bubble.
        keepExpandedOnHide = true
        ctrlSvc.stepAwayFromBlockedApp()
    }

    override fun hideWindow() {
        stopTimer()
        // Reset expansion state here (not only on the show path): the window can
        // be hidden mid-offer by timer expiry / revalidation, and resetting only
        // in showWindow() can be skipped if a re-show races the hide fade-out —
        // leaving a stale full-screen overlay that would block the app. The
        // exception is the deliberate leave (pull down → step away), which keeps
        // the expanded sun on screen so it fades out as the pause (the reset then
        // happens in onWindowRemoved).
        if (!keepExpandedOnHide) {
            isExpanded = false
            enterWithFade = false
        }
        super.hideWindow()
    }

    override fun onWindowRemoved() {
        // Window is gone — clear expansion so the next show starts as the bubble
        // (the deliberate leaves keep it expanded through the fade, so reset only now).
        isExpanded = false
        enterWithFade = false
        keepExpandedOnHide = false

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
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }
}

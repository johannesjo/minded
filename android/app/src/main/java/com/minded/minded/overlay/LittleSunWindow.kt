package com.minded.minded.overlay

import android.animation.ValueAnimator
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
    private val bubbleSizePx = (60 * density).roundToInt()
    // Keep the bubble this far in from every screen edge. Resting flush put the
    // bubble's touch area inside the system back-gesture zone, so grabbing it to
    // drag fired Back instead. A small inset (paired with
    // Modifier.systemGestureExclusion on the bubble) keeps the drag ours while
    // still reading as a companion parked near the side.
    private val edgeMarginPx = (8 * density).roundToInt()

    // Current resting position of the bubble (top-left gravity, pixels). Drag
    // mutates these; on release the bubble snaps to the nearest side edge.
    private var posX = 0
    private var posY = 0

    // Drives whether the overlay is the small resting bubble or the full-screen
    // pause + step-away invitation. A Compose state so Cmp() recomposes.
    private var isExpanded by mutableStateOf(false)
    // True only when re-showing the resting bubble after the offer collapses, so
    // it fades back in rather than snapping. Reset on a fresh show.
    private var enterWithFade by mutableStateOf(false)
    // The bubble's screen-px centre captured at the moment of tap, so the pause
    // sun can expand out of exactly where the little sun sat.
    private var expandOriginX by mutableStateOf(-1)
    private var expandOriginY by mutableStateOf(-1)
    private var snapAnimator: ValueAnimator? = null

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

    private fun screenWidthPx() = ctrlSvc.resources.displayMetrics.widthPixels
    private fun screenHeightPx() = ctrlSvc.resources.displayMetrics.heightPixels

    // Status-bar (top) and navigation-bar (bottom) heights, so the bubble keeps
    // the same visible gap from the top/bottom as from the sides: it rests below
    // the status bar and above the nav bar, never tucked under either. These only
    // ever *add* margin, so an over-estimate (e.g. gesture-nav still reporting a
    // full nav-bar height) merely parks it a touch higher — never under a bar.
    private fun systemBarInsetTopPx() = systemDimenPx("status_bar_height")
    private fun systemBarInsetBottomPx() = systemDimenPx("navigation_bar_height")

    private fun systemDimenPx(resName: String): Int {
        val id = ctrlSvc.resources.getIdentifier(resName, "dimen", "android")
        return if (id > 0) ctrlSvc.resources.getDimensionPixelSize(id) else 0
    }

    private fun initPosition() {
        val saved = ctrlSvc.getSharedPreferenceService().getLittleSunPosition()
        if (saved != null) {
            posX = saved.first
            posY = saved.second
        } else {
            // Default to the bottom-left, where the little sun has always rested.
            posX = (8 * density).roundToInt()
            posY = screenHeightPx() - bubbleSizePx - (96 * density).roundToInt()
        }
        clampPosition()
    }

    private fun clampPosition() {
        // Stay a margin in from every edge so the bubble never sits in a system
        // gesture zone. Top/bottom also clear the status and navigation bars, so
        // the visible gap there matches the left/right one (see edgeMarginPx).
        val minX = edgeMarginPx
        val maxX = (screenWidthPx() - bubbleSizePx - edgeMarginPx).coerceAtLeast(minX)
        val minY = systemBarInsetTopPx() + edgeMarginPx
        val maxY = (screenHeightPx() - bubbleSizePx - systemBarInsetBottomPx() - edgeMarginPx)
            .coerceAtLeast(minY)
        posX = posX.coerceIn(minX, maxX)
        posY = posY.coerceIn(minY, maxY)
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
        snapAnimator?.cancel()
        posX += dxPx.roundToInt()
        posY += dyPx.roundToInt()
        clampPosition()
        updateLayout()
    }

    private fun onDragEnd() {
        if (isExpanded) return
        clampPosition()
        // Settle against whichever side is nearer — the chat-head feel — but rest
        // a margin in from the edge, never flush, so the next drag doesn't collide
        // with the system back-gesture.
        val leftTarget = edgeMarginPx
        val rightTarget = screenWidthPx() - bubbleSizePx - edgeMarginPx
        val targetX = if (posX + bubbleSizePx / 2 < screenWidthPx() / 2) leftTarget else rightTarget
        animateSnapToX(targetX)
        ctrlSvc.getSharedPreferenceService().saveLittleSunPosition(targetX, posY)
    }

    private fun animateSnapToX(targetX: Int) {
        snapAnimator?.cancel()
        if (posX == targetX) return
        snapAnimator = ValueAnimator.ofInt(posX, targetX).apply {
            duration = 220
            addUpdateListener {
                posX = it.animatedValue as Int
                updateLayout()
            }
            start()
        }
    }

    private fun expand() {
        if (isExpanded) return
        snapAnimator?.cancel()
        // Capture where the bubble sits now so the pause sun expands out of it.
        expandOriginX = posX + bubbleSizePx / 2
        expandOriginY = posY + bubbleSizePx / 2
        isExpanded = true
        updateLayout()
    }

    private fun collapse() {
        if (!isExpanded) return
        // Fade the bubble back in as it returns from the offer, never snap.
        enterWithFade = true
        isExpanded = false
        clampPosition()
        updateLayout()
    }

    private fun stepAway() {
        ctrlSvc.stepAwayFromBlockedApp()
    }

    override fun hideWindow() {
        stopTimer()
        snapAnimator?.cancel()
        snapAnimator = null
        // Reset expansion state here (not only on the show path): the window can
        // be hidden mid-offer by timer expiry / revalidation, and resetting only
        // in showWindow() can be skipped if a re-show races the hide fade-out —
        // leaving a stale full-screen overlay that would block the app.
        isExpanded = false
        enterWithFade = false
        super.hideWindow()
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
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }
}

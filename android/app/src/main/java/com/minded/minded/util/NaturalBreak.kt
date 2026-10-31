package com.minded.minded.util

import android.os.Handler
import android.os.Looper

/**
 * The natural break, native side (extension/src/shared/components/interaction/
 * naturalBreak.ts). When the Little Sun is due to hand back to the full pause
 * mid-session - grace used up, a chosen time run out - it doesn't cut in at
 * that second: it waits for the user to finish what they are doing, so the
 * pause never lands mid-message or mid-video, where it would only be tapped
 * away.
 *
 * A break is only ever observed behaviour, as the accessibility service sees
 * it in the app the sun is resting over:
 * - **A new screen** - the app moved to another window (a post opened, a
 *   profile, a menu). One thing is finished and the next hasn't started.
 * - **Scrolling - but only after a while** ([NATURAL_BREAK_SCROLL_FALLBACK_MS]).
 *   Reading is scrolling too, so it gets a few more minutes first; a feed,
 *   though, can be scrolled for an hour without a single new screen, so after
 *   that the next scroll is the break - the doom-scroll moment the pause is
 *   for. Scrolls that are clearly sideways-only are left out (carousels and
 *   banners slide by themselves); many lists report no deltas at all, so an
 *   unknown direction still counts.
 *
 * Toasts are not screens: a "Saved" toast popping up is not the user moving on.
 *
 * Leaving the app needs no rule here: the bubble hides (which cancels the
 * wait), and coming back is a fresh open that the decision engine routes.
 */

/** Mirrors SCROLL_FALLBACK_MS in naturalBreak.ts. */
const val NATURAL_BREAK_SCROLL_FALLBACK_MS = 3 * 60 * 1000L

enum class NaturalBreakSignal { SCREEN_CHANGED, SCROLL }

/**
 * Whether one accessibility signal is the break the waiting Little Sun is
 * after. Pure, so the rule is unit-tested apart from the service.
 *
 * @param startScreen the window class the app showed when the wait began, or
 *   null if none was seen yet (then any screen event from the app counts as
 *   the first one seen, not a change).
 */
fun isNaturalBreak(
    signal: NaturalBreakSignal,
    eventPackage: String,
    eventScreen: String?,
    waitingPackage: String,
    startScreen: String?,
    waitingSinceMs: Long,
    nowMs: Long,
): Boolean {
    if (eventPackage != waitingPackage) return false
    return when (signal) {
        NaturalBreakSignal.SCREEN_CHANGED ->
            startScreen != null && isScreen(eventScreen) && eventScreen != startScreen
        NaturalBreakSignal.SCROLL ->
            nowMs - waitingSinceMs >= NATURAL_BREAK_SCROLL_FALLBACK_MS
    }
}

/** A window class that stands for a screen the user moved to (not a toast). */
fun isScreen(windowClass: String?): Boolean =
    !windowClass.isNullOrEmpty() && !windowClass.contains("Toast")

/**
 * A scroll that is clearly sideways-only (a carousel sliding by). Many lists
 * report zero (or unset, -1) deltas, so anything not plainly sideways counts.
 */
fun isSidewaysOnlyScroll(deltaX: Int, deltaY: Int): Boolean =
    kotlin.math.abs(deltaX) > 1 && kotlin.math.abs(deltaY) <= 1

/**
 * Process-wide meeting point between the Little Sun (which waits) and the
 * accessibility service (which sees the app). There is only ever one Little
 * Sun, so there is at most one wait. Scroll events are subscribed to only
 * while a wait is open - every scroll in every app is a lot of traffic to take
 * for nothing.
 */
object NaturalBreakGate {

    private class Waiting(
        val packageName: String,
        val sinceMs: Long,
        var screen: String?,
        val onBreak: () -> Unit,
    )

    @Volatile
    private var waiting: Waiting? = null

    // The last window class seen per package, so a wait that opens mid-screen
    // knows which screen it started on.
    @Volatile
    private var lastScreen: Pair<String, String>? = null

    /**
     * Set by the accessibility service while it is connected: turns its scroll
     * subscription on (true) or off (false). Null when it isn't running.
     */
    @Volatile
    var onListeningChanged: ((Boolean) -> Unit)? = null

    /**
     * Without the accessibility service nothing can be observed, so a wait
     * would never end - the caller hands back straight away instead.
     */
    fun canWatch(): Boolean = onListeningChanged != null

    fun isWaiting(): Boolean = waiting != null

    /** Waits for the next break in [packageName]; [onBreak] runs once, on the main thread. */
    fun await(packageName: String, nowMs: Long, onBreak: () -> Unit) {
        val screen = lastScreen?.takeIf { it.first == packageName }?.second
        waiting = Waiting(packageName, nowMs, screen, onBreak)
        onListeningChanged?.invoke(true)
    }

    fun cancel() {
        if (waiting == null) return
        waiting = null
        onListeningChanged?.invoke(false)
    }

    /** From the accessibility service: a window-state change in [packageName]. */
    fun onScreen(packageName: String, screen: String?, nowMs: Long) {
        val w = waiting
        if (w != null && isNaturalBreak(
                NaturalBreakSignal.SCREEN_CHANGED, packageName, screen,
                w.packageName, w.screen, w.sinceMs, nowMs,
            )
        ) {
            fire(w)
        } else if (w != null && w.packageName == packageName && w.screen == null && isScreen(screen)) {
            w.screen = screen
        }
        if (screen != null && isScreen(screen)) lastScreen = packageName to screen
    }

    /** From the accessibility service: a (not sideways-only) scroll in [packageName]. */
    fun onScroll(packageName: String, nowMs: Long) {
        val w = waiting ?: return
        if (isNaturalBreak(
                NaturalBreakSignal.SCROLL, packageName, null,
                w.packageName, w.screen, w.sinceMs, nowMs,
            )
        ) {
            fire(w)
        }
    }

    private fun fire(w: Waiting) {
        if (waiting !== w) return
        waiting = null
        onListeningChanged?.invoke(false)
        Handler(Looper.getMainLooper()).post { w.onBreak() }
    }
}

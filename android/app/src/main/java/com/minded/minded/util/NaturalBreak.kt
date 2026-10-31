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
 * Not every window is a screen: toasts, dialogs, popup menus and bottom sheets
 * (the comment sheet, the share sheet, a reply composer) open *into* what the
 * user is doing, so a pause there would land mid-message. Generic framework
 * containers (android.widget.*, android.view.*) are content shuffling inside a
 * screen, not a new one. Scrolls from a text field - a long message scrolling
 * as it's typed - are typing, not scrolling.
 *
 * **Never later than [NATURAL_BREAK_MAX_WAIT_MS]** (the Little Sun enforces it):
 * an app that sends no events (a game, a video player) would otherwise keep the
 * pause away for good. The wait softens *when* the pause comes, never *whether*.
 * Switching straight to another blocked app is a break in itself.
 *
 * Leaving the app needs no rule here: the bubble hides (which cancels the
 * wait), and coming back is a fresh open that the decision engine routes.
 */

/** 3 minutes. Mirrors SCROLL_FALLBACK_MS in naturalBreak.ts (naturalBreakMirror.test.ts). */
const val NATURAL_BREAK_SCROLL_FALLBACK_MS = 180000L

/** 15 minutes. Mirrors MAX_WAIT_MS in naturalBreak.ts (naturalBreakMirror.test.ts). */
const val NATURAL_BREAK_MAX_WAIT_MS = 900000L

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

private val NOT_A_SCREEN = listOf("Toast", "Dialog", "Popup", "BottomSheet", "Menu")

/**
 * A window class that stands for a screen the user moved to - not a toast,
 * dialog, popup or sheet opening into the current one, and not a generic
 * framework container.
 */
fun isScreen(windowClass: String?): Boolean {
    if (windowClass.isNullOrEmpty()) return false
    if (windowClass.startsWith("android.widget.") || windowClass.startsWith("android.view.")) {
        return false
    }
    return NOT_A_SCREEN.none { windowClass.contains(it) }
}

/**
 * Whether a scroll event is the user scrolling: not a carousel sliding by
 * itself (clearly sideways-only), and not a text field scrolling as it's typed.
 */
fun isUserScroll(deltaX: Int, deltaY: Int, sourceClass: String?, isEditable: Boolean): Boolean =
    !isSidewaysOnlyScroll(deltaX, deltaY) &&
        !isEditable &&
        sourceClass?.contains("EditText") != true

/**
 * Whether a waiting Little Sun should stop waiting and bring the pause now:
 * the ceiling is reached, or nothing can observe a break any more (the
 * accessibility service went away mid-wait).
 */
fun shouldEndWaitWithoutBreak(waitingSinceMs: Long, nowMs: Long, canWatch: Boolean): Boolean =
    nowMs - waitingSinceMs >= NATURAL_BREAK_MAX_WAIT_MS || !canWatch

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
        val isBlocked: (String) -> Boolean,
        val onBreak: (String) -> Unit,
    )

    @Volatile
    private var waiting: Waiting? = null

    // The last screen seen per package, so a wait that opens mid-screen knows
    // which screen it started on - other packages' windows (system UI, the
    // keyboard, minded's own pause) never overwrite the app's. Touched on the
    // main thread only (accessibility callbacks, the Little Sun's ticks).
    private val lastScreenByPackage = HashMap<String, String>()

    /** How a fired break is delivered; the main looper, swappable in tests. */
    internal var post: (() -> Unit) -> Unit = { Handler(Looper.getMainLooper()).post(it) }

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

    /**
     * Waits for the next break in [packageName]; [onBreak] runs once, on the
     * main thread, with the package the user is in at the break - another
     * blocked app if they switched straight to one, which [isBlocked] tells.
     */
    fun await(
        packageName: String,
        nowMs: Long,
        isBlocked: (String) -> Boolean,
        onBreak: (String) -> Unit,
    ) {
        val screen = lastScreenByPackage[packageName]
        waiting = Waiting(packageName, nowMs, screen, isBlocked, onBreak)
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
        if (w != null && packageName != w.packageName && w.isBlocked(packageName)) {
            // Straight into another blocked app: a break in itself, and the
            // pause belongs to the app now in front.
            fire(w, packageName)
        } else if (w != null && isNaturalBreak(
                NaturalBreakSignal.SCREEN_CHANGED, packageName, screen,
                w.packageName, w.screen, w.sinceMs, nowMs,
            )
        ) {
            fire(w, packageName)
        } else if (w != null && w.packageName == packageName && w.screen == null && isScreen(screen)) {
            w.screen = screen
        }
        if (screen != null && isScreen(screen)) lastScreenByPackage[packageName] = screen
    }

    /** From the accessibility service: a user scroll (see [isUserScroll]) in [packageName]. */
    fun onScroll(packageName: String, nowMs: Long) {
        val w = waiting ?: return
        if (isNaturalBreak(
                NaturalBreakSignal.SCROLL, packageName, null,
                w.packageName, w.screen, w.sinceMs, nowMs,
            )
        ) {
            fire(w, packageName)
        }
    }

    /** Back to a clean slate - for tests only. */
    internal fun resetForTest() {
        waiting = null
        lastScreenByPackage.clear()
        onListeningChanged = null
        post = { Handler(Looper.getMainLooper()).post(it) }
    }

    private fun fire(w: Waiting, packageName: String) {
        if (waiting !== w) return
        waiting = null
        onListeningChanged?.invoke(false)
        post { w.onBreak(packageName) }
    }
}

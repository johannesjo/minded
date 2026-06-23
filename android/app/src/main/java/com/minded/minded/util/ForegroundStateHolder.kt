package com.minded.minded.util

/**
 * The freshest known foreground app, captured from whichever detection source
 * last produced a confident read.
 *
 * @param packageName The confidently-focused user app.
 * @param timestampMs When this read was taken (System.currentTimeMillis()).
 * @param source Which detector produced it ("accessibility" or "usage_stats"),
 *   for debugging only.
 */
data class ForegroundState(
    val packageName: String,
    val timestampMs: Long,
    val source: String
)

/**
 * Process-wide, thread-safe holder for the freshest foreground read, used by the
 * overlay controller as a render-time liveness gate: right before drawing the
 * sun it consults this to skip the draw if fresh evidence says the user already
 * left the target app (guard 2b in docs/sun-escalation-and-detection-reliability.md).
 *
 * Mirrors the @Volatile snapshot pattern of MyAccessibilityService.focusSnapshot:
 * a single immutable snapshot is published atomically, read from any thread
 * without locking.
 *
 * NOTE: the only writers today live inside MyAccessibilityService /
 * HybridAppDetector, which die when the accessibility service is off. So this
 * holder goes stale in degraded (poll-only) mode; that is the separate detector
 * re-parenting slice, not fixed here. Readers must therefore treat stale/absent
 * data as "no evidence" and default to allowing the draw.
 */
object ForegroundStateHolder {

    @Volatile
    private var state: ForegroundState? = null

    /** Records a confident foreground read, stamped with the current time. */
    fun update(packageName: String, source: String) {
        state = ForegroundState(packageName, System.currentTimeMillis(), source)
    }

    /** Returns the latest snapshot, or null if none has been recorded. */
    fun current(): ForegroundState? = state
}

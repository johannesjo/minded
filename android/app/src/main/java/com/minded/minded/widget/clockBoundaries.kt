package com.minded.minded.widget

/**
 * Minutes from a local wall-clock time until the next of the given boundary
 * hours (ascending, 0–23), wrapping to the first one tomorrow once past the
 * last. Always strictly positive: landing exactly on a boundary schedules the
 * following one, never an immediate re-fire. [WidgetPrompts] uses it for the one
 * alarm that spans the wordless night, to the next day-start.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 */
internal fun minutesUntilNext(boundaryHours: IntArray, hour: Int, minute: Int): Int {
    val nowMin = hour.mod(24) * 60 + minute.mod(60)
    for (boundaryHour in boundaryHours) {
        val boundaryMin = boundaryHour * 60
        if (boundaryMin > nowMin) return boundaryMin - nowMin
    }
    // Past the last boundary today: wrap to the first one tomorrow.
    return boundaryHours.first() * 60 + 24 * 60 - nowMin
}

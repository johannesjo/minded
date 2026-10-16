package com.minded.minded.widget

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

/**
 * The moon's phase for the widget - the port of the app's lunarPhase.ts and
 * moonShadow.ts. In the app the night companion is tonight's moon, a crescent or
 * a gibbous with its dark side veiled by earthshine; a widget that always drew a
 * full moon would be a second, different moon on the home screen. There is only
 * ever one.
 *
 * The phase is the mean synodic month from a known new moon (the date alone).
 * The night side is drawn the app's way: everything on the dark side of the
 * terminator - a half-ellipse |cos(phase)| wide - in a dim cool earthshine,
 * softly blurred, never a cut-out edge. [luneOutline] gives the lit lune's
 * outline (in disc units, 0..100 across the disc's box) for both platforms'
 * renderers to subtract from the disc; the shadow is everything else.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 * widgetSolarMirror.test.ts pins the constants to the TS sources.
 */
object WidgetMoon {

    const val SYNODIC_MONTH_DAYS = 29.530588853

    /** The new moon of 2000-01-06 18:14 UTC - lunarPhase.ts's reference epoch. */
    private const val REFERENCE_NEW_MOON_MS = 947_182_440_000L
    private const val DAY_MS = 86_400_000.0

    /** The earthshine: the dark side's colour (#141e3d) and how much it veils. */
    const val EARTHSHINE_RGB = 0x141E3D
    const val EARTHSHINE_OPACITY = 0.7f

    /** The terminator's softness: a gaussian of this σ, in disc units (of 100). */
    const val BLUR_STD_DEVIATION = 3f

    /** How far past the lit limb the light may reach before the blur, at most. */
    private const val LIMB_MARGIN = 20.0

    /** Above this lit fraction the shadow is a hairline: draw a plain full moon. */
    private const val FULL_MOON_ILLUMINATION = 0.99

    /** Points per half-ellipse of the outline - far finer than any widget disc shows. */
    private const val SEGMENTS = 32

    data class Phase(val cycle: Double, val illumination: Double, val isWaxing: Boolean)

    fun phaseAt(epochMillis: Long): Phase {
        val days = (epochMillis - REFERENCE_NEW_MOON_MS) / DAY_MS
        val age = days.mod(SYNODIC_MONTH_DAYS)
        val cycle = age / SYNODIC_MONTH_DAYS
        return Phase(
            cycle = cycle,
            illumination = (1 - cos(2 * PI * cycle)) / 2,
            isWaxing = cycle < 0.5,
        )
    }

    /**
     * The lit lune's outline as (x, y) points in disc units (0..100 across the
     * disc's bounding box, y down): out along the limb from the top pole to the
     * bottom one, then back up the terminator. Null at (near) full moon, where
     * there is no night side to draw. Lit on the right while waxing in the north,
     * mirrored for the other three cases (the southern sky waxes from the left).
     *
     * The limb runs a little past the disc's edge (moonShadow.ts LIMB_MARGIN,
     * shrinking with the crescent) so the blur doesn't drag earthshine in over
     * the lit rim - the disc clip hides the overhang.
     */
    fun luneOutline(phase: Phase, isSouthernHemisphere: Boolean): List<Pair<Float, Float>>? {
        if (phase.illumination >= FULL_MOON_ILLUMINATION) return null
        val c = cos(2 * PI * phase.cycle) // 1 new … -1 full
        val rx = 50 * abs(c)
        // A crescent's terminator bulges into the lit half (right), a gibbous
        // one away from it (left).
        val bulge = if (c > 0) 1 else -1
        val litWidth = 50 * (1 - c)
        val rLimb = 50 + minOf(LIMB_MARGIN, 2 * litWidth)
        val mirror = phase.isWaxing == isSouthernHemisphere

        val points = ArrayList<Pair<Float, Float>>(2 * SEGMENTS + 2)
        fun add(x: Double, y: Double) {
            val px = if (mirror) 100 - x else x
            points.add(px.toFloat() to y.toFloat())
        }
        // The limb: top pole → right → bottom pole.
        for (i in 0..SEGMENTS) {
            val t = -PI / 2 + PI * i / SEGMENTS
            add(50 + rLimb * cos(t), 50 + 50 * sin(t))
        }
        // The terminator: bottom pole → back up to the top.
        for (i in 0..SEGMENTS) {
            val t = PI / 2 - PI * i / SEGMENTS
            add(50 + bulge * rx * cos(t), 50 + 50 * sin(t))
        }
        return points
    }
}

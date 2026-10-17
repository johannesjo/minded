package com.minded.minded.widget

import java.time.Instant
import java.time.ZoneId
import java.time.ZoneOffset
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.asin
import kotlin.math.cos
import kotlin.math.sin

/**
 * The true sky for the widget: the Kotlin port of the app's
 * extension/src/shared/sky/solarSky.ts (+ solarPosition.ts, timeZoneLocation.ts),
 * so the home-screen sun gives way to the moon at the same real dusk the app does
 * - not at a fixed 19:00 that is broad daylight in a Berlin June and an hour after
 * dark in its December. There is only ever one sun; the widget and the app must
 * not disagree about whether it is up.
 *
 * Only what a widget can show is ported: whether it is night (the moon, the
 * dark sky, the wordless card), where the light sky sits on the palette's clock
 * (which baked sky face to pick), and how much of the sunset is still in the
 * night sky (the afterglow - which picks the card's nightfall face over the deep
 * night one, WidgetSky). The stars and the polar-midnight crossfade stay in the
 * app - a static snapshot can't carry them; the moon phase is WidgetMoon's.
 *
 * Location comes from the time zone alone (WidgetTimeZones, the same generated
 * table the app reads), no permission, no network. An unknown zone (UTC, Etc/…)
 * falls back to the fixed clock - exactly the app's own fallback.
 *
 * Pure logic, free of Android/R references so it can be unit-tested on the JVM.
 * widgetSolarMirror.test.ts pins the constants to the TS sources.
 */
object WidgetSun {

    /** Golden hour ends / blue hour begins: the day↔night boundary (solarSky.ts). */
    const val NIGHT_ELEVATION = -4.0

    /** Astronomical night: the twilight has fully drained (solarSky.ts). */
    const val TRUE_NIGHT_ELEVATION = -18.0

    // The afterglow is the sunset's warmth, evening only: it eases in over the
    // hour angle's first AFTERGLOW_EASE_DEG after solar noon and out over the
    // last before solar midnight (solarSky.ts eveningWeight).
    internal const val AFTERGLOW_EASE_DEG = 30.0

    // The fixed-clock fallback's afterglow window (skyTimeline.ts
    // nightAfterglowAt): full at night start (SunWidgetPhase.NIGHT_START), gone
    // by this hour.
    internal const val NIGHT_AFTERGLOW_END_HOUR = 21.0

    // The palette clock's keyframe hours (skyTimeline.ts AMBIENT_SKY_KEYFRAMES).
    internal const val DAWN_HOUR = 6.0
    internal const val MORNING_HOUR = 9.0
    internal const val MIDDAY_HOUR = 13.0
    internal const val AFTERNOON_HOUR = 16.5
    internal const val DUSK_HOUR = 19.0

    // Where each keyframe sits on the sun's climb, 0 (night boundary) → 1
    // (today's noon height) - solarSky.ts RISING / SETTING, one-to-one.
    private val RISING = arrayOf(0.0 to DAWN_HOUR, 0.5 to MORNING_HOUR, 1.0 to MIDDAY_HOUR)
    private val SETTING = arrayOf(1.0 to MIDDAY_HOUR, 0.6 to AFTERNOON_HOUR, 0.0 to DUSK_HOUR)

    private const val RAD = PI / 180
    private const val DAY_MS = 86_400_000L

    data class LatLon(val lat: Double, val lon: Double)

    /**
     * The present moment's light: [isNight] (the moon) and [skyHour], the light
     * sky's position on the palette clock (skyTimeline's hours - fed to
     * [WidgetSky.forSkyHour]). [fromSun] is false on the fixed-clock fallback.
     */
    data class Moment(
        val isNight: Boolean,
        val skyHour: Double,
        val fromSun: Boolean,
        /** The moon is seen flipped left-right from the south (WidgetMoon). */
        val isSouthernHemisphere: Boolean = false,
        /**
         * The sunset's warmth left in the night sky, 1 → 0 - the app's
         * --night-afterglow (SkyMoment.afterglow). Always 0 by day.
         */
        val afterglow: Double = 0.0,
    )

    /** The sun's elevation and hour angle (degrees) - solarPositionAt, ported. */
    internal data class Position(val elevation: Double, val hourAngle: Double, val declination: Double)

    internal fun positionAt(epochMillis: Long, lat: Double, lon: Double): Position {
        val utc = Instant.ofEpochMilli(epochMillis).atOffset(ZoneOffset.UTC)
        val startOfYear = utc.toLocalDate().withDayOfYear(1).atStartOfDay()
            .toInstant(ZoneOffset.UTC).toEpochMilli()
        val dayOfYear = Math.floorDiv(epochMillis - startOfYear, DAY_MS) + 1
        val hour = utc.hour + utc.minute / 60.0 + utc.second / 3600.0
        val g = (2 * PI / 365) * (dayOfYear - 1 + (hour - 12) / 24)

        val eqTimeMin = 229.18 * (
            0.000075 +
                0.001868 * cos(g) -
                0.032077 * sin(g) -
                0.014615 * cos(2 * g) -
                0.040849 * sin(2 * g)
            )
        val decl = 0.006918 -
            0.399912 * cos(g) +
            0.070257 * sin(g) -
            0.006758 * cos(2 * g) +
            0.000907 * sin(2 * g) -
            0.002697 * cos(3 * g) +
            0.00148 * sin(3 * g)

        val utcMin = utc.hour * 60 + utc.minute + utc.second / 60.0
        val trueSolarMin = utcMin + eqTimeMin + 4 * lon
        // Normalise to -180..180 so the sign says which side of noon we're on.
        val hourAngle = (trueSolarMin / 4).mod(360.0) - 180

        val phi = lat * RAD
        val sinEl = sin(phi) * sin(decl) + cos(phi) * cos(decl) * cos(hourAngle * RAD)
        return Position(
            elevation = asin(sinEl.coerceIn(-1.0, 1.0)) / RAD,
            hourAngle = hourAngle,
            declination = decl / RAD,
        )
    }

    private fun alongAnchors(anchors: Array<Pair<Double, Double>>, p: Double): Double {
        for (i in 1 until anchors.size) {
            val (p0, h0) = anchors[i - 1]
            val (p1, h1) = anchors[i]
            if (p >= minOf(p0, p1) && p <= maxOf(p0, p1)) {
                return h0 + (p - p0) / (p1 - p0) * (h1 - h0)
            }
        }
        return anchors.last().second
    }

    /** How much of the evening a given hour angle is (solarSky.ts eveningWeight). */
    private fun eveningWeight(hourAngle: Double): Double =
        if (hourAngle <= 0) {
            0.0
        } else {
            (hourAngle / AFTERGLOW_EASE_DEG).coerceIn(0.0, 1.0) *
                ((180 - hourAngle) / AFTERGLOW_EASE_DEG).coerceIn(0.0, 1.0)
        }

    /** The clock fallback's afterglow at a fractional hour (nightAfterglowAt). */
    internal fun nightAfterglowAt(hour: Double): Double {
        val start = SunWidgetPhase.NIGHT_START.toDouble()
        return if (hour < start || hour >= NIGHT_AFTERGLOW_END_HOUR) {
            0.0
        } else {
            1 - (hour - start) / (NIGHT_AFTERGLOW_END_HOUR - start)
        }
    }

    /** The light at [epochMillis] for an observer at [location] - skyMomentAt. */
    fun momentAt(epochMillis: Long, location: LatLon): Moment {
        val (elevation, hourAngle, declination) = positionAt(epochMillis, location.lat, location.lon)
        val isNight = elevation < NIGHT_ELEVATION
        // The twilight's depth: the afterglow drains as the stars come out.
        val starDepth = ((NIGHT_ELEVATION - elevation) / (NIGHT_ELEVATION - TRUE_NIGHT_ELEVATION))
            .coerceIn(0.0, 1.0)
        val noon = 90 - abs(location.lat - declination)
        val p = if (noon > NIGHT_ELEVATION) {
            ((elevation - NIGHT_ELEVATION) / (noon - NIGHT_ELEVATION)).coerceIn(0.0, 1.0)
        } else {
            0.0
        }
        val skyHour = if (hourAngle >= 0) alongAnchors(SETTING, p) else alongAnchors(RISING, p)
        return Moment(
            isNight = isNight,
            skyHour = skyHour,
            fromSun = true,
            isSouthernHemisphere = location.lat < 0,
            afterglow = if (isNight) (1 - starDepth) * eveningWeight(hourAngle) else 0.0,
        )
    }

    /** The fixed-clock fallback (no location) - clockSkyMoment. */
    fun clockMomentAt(epochMillis: Long, zone: ZoneId): Moment {
        val local = Instant.ofEpochMilli(epochMillis).atZone(zone)
        val hour = local.hour + local.minute / 60.0
        return Moment(
            isNight = SunWidgetPhase.forHour(local.hour) == SunWidgetPhase.NIGHT,
            skyHour = hour,
            fromSun = false,
            afterglow = nightAfterglowAt(hour),
        )
    }

    /** The light at [epochMillis] in [zone]: the real sun when the zone has a place. */
    fun momentAt(epochMillis: Long, zone: ZoneId): Moment {
        val location = WidgetTimeZones.locationFor(zone.id)
        return if (location != null) momentAt(epochMillis, location) else clockMomentAt(epochMillis, zone)
    }

    /**
     * The next instant (epoch ms, to the minute) after [fromMillis] at which
     * night begins or ends, or null if none within [horizonHours] (polar day /
     * polar night). Sampled every 10 minutes, then bisected to the minute - the
     * same walk as solarSky.ts nightWindowsFrom, so the widget flips within a
     * minute of the app.
     */
    fun nextNightFlip(fromMillis: Long, zone: ZoneId, horizonHours: Int = 48): Long? =
        nextFlipOf(fromMillis, zone, horizonHours) { it.isNight }

    /**
     * The next instant (epoch ms, to the minute) after [fromMillis] at which the
     * card's nightfall face begins or ends (WidgetSky.NIGHTFALL - the afterglow
     * draining past its threshold), or null if none within [horizonHours]. The
     * same walk as [nextNightFlip]: the end of nightfall lands on any minute, and
     * the night's single alarm has to wake for it.
     */
    fun nextNightfallFlip(fromMillis: Long, zone: ZoneId, horizonHours: Int = 48): Long? =
        nextFlipOf(fromMillis, zone, horizonHours) { WidgetSky.forMoment(it) == WidgetSky.NIGHTFALL }

    private fun nextFlipOf(
        fromMillis: Long,
        zone: ZoneId,
        horizonHours: Int,
        of: (Moment) -> Boolean,
    ): Long? {
        val stateAt = { t: Long -> of(momentAt(t, zone)) }
        val start = stateAt(fromMillis)
        val end = fromMillis + horizonHours * 3_600_000L
        var lo = fromMillis
        var t = fromMillis + STEP_MS
        while (t <= end) {
            if (stateAt(t) != start) {
                var hi = t
                while (hi - lo > 60_000L) {
                    val mid = lo + (hi - lo) / 2
                    if (stateAt(mid) == start) lo = mid else hi = mid
                }
                return hi
            }
            lo = t
            t += STEP_MS
        }
        return null
    }

    private const val STEP_MS = 10 * 60_000L
}

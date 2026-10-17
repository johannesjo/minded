package com.minded.minded.widget

import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class WidgetSunTest {

    private data class Fixture(
        val zone: String,
        val epochMillis: Long,
        val isNight: Boolean,
        val skyHour: Double,
        val afterglow: Double,
    )

    // Expected values computed by the app's own solarSky.skyMomentAt - so the
    // widget and the app agree on whether the sun is up, and on the sky face.
    // widgetSolarMirror.test.ts re-derives every row from the TS on each jest
    // run, so this table can't silently drift from the app.
    private val fixtures = listOf(
        Fixture("Europe/Berlin", 1782066600000L, false, 18.2673, 0.0000),
        Fixture("Europe/Berlin", 1782073800000L, true, 19.0000, 0.8512),
        Fixture("Europe/Berlin", 1797870600000L, true, 19.0000, 0.3306),
        Fixture("Europe/Berlin", 1797840000000L, false, 8.6009, 0.0000),
        Fixture("Europe/Berlin", 1774000800000L, false, 12.5429, 0.0000),
        Fixture("Australia/Sydney", 1782025200000L, false, 18.7688, 0.0000),
        Fixture("America/New_York", 1792188000000L, false, 18.4402, 0.0000),
        Fixture("America/New_York", 1792162800000L, false, 12.0615, 0.0000),
        Fixture("Asia/Tokyo", 1767594600000L, false, 17.2589, 0.0000),
        // A Berlin October evening: nightfall (19:00), deep night (20:30), and
        // the pre-dawn - night, but never any afterglow (it is the sunset's).
        Fixture("Europe/Berlin", 1792256400000L, true, 19.0000, 0.6976),
        Fixture("Europe/Berlin", 1792261800000L, true, 19.0000, 0.0000),
        Fixture("Europe/Berlin", 1792294200000L, true, 6.0000, 0.0000),
    )

    @Test
    fun `matches the app's true sky`() {
        for (f in fixtures) {
            val moment = WidgetSun.momentAt(f.epochMillis, ZoneId.of(f.zone))
            assertTrue(moment.fromSun, "${f.zone} has a place")
            assertEquals(f.isNight, moment.isNight, "${f.zone} @ ${f.epochMillis}")
            assertEquals(f.skyHour, moment.skyHour, 0.001, "${f.zone} @ ${f.epochMillis}")
            assertEquals(f.afterglow, moment.afterglow, 0.001, "${f.zone} @ ${f.epochMillis}")
        }
    }

    @Test
    fun `a Berlin June evening is still day, a Berlin December teatime is night`() {
        // The fixed clock got both of these wrong (night at 19:00).
        val berlin = ZoneId.of("Europe/Berlin")
        val juneEvening = ZonedDateTime.of(2026, 6, 21, 20, 30, 0, 0, berlin)
        assertFalse(WidgetSun.momentAt(juneEvening.toInstant().toEpochMilli(), berlin).isNight)
        val decemberTea = ZonedDateTime.of(2026, 12, 21, 17, 30, 0, 0, berlin)
        assertTrue(WidgetSun.momentAt(decemberTea.toInstant().toEpochMilli(), berlin).isNight)
    }

    @Test
    fun `a zone with no place falls back to the fixed clock`() {
        val utc = ZoneId.of("UTC")
        val noon = ZonedDateTime.of(2026, 6, 21, 12, 0, 0, 0, utc).toInstant().toEpochMilli()
        val moment = WidgetSun.momentAt(noon, utc)
        assertFalse(moment.fromSun)
        assertFalse(moment.isNight)
        assertEquals(12.0, moment.skyHour, 1e-9)
        val late = ZonedDateTime.of(2026, 6, 21, 19, 0, 0, 0, utc).toInstant().toEpochMilli()
        assertTrue(WidgetSun.momentAt(late, utc).isNight)
        // The clock's afterglow (nightAfterglowAt): full at 19:00, half at
        // 20:00, gone from 21:00 - and none in the small hours.
        val afterglowAt = { h: Int ->
            WidgetSun.momentAt(ZonedDateTime.of(2026, 6, 21, h, 0, 0, 0, utc).toInstant().toEpochMilli(), utc).afterglow
        }
        assertEquals(1.0, afterglowAt(19), 1e-9)
        assertEquals(0.5, afterglowAt(20), 1e-9)
        assertEquals(0.0, afterglowAt(21), 1e-9)
        assertEquals(0.0, afterglowAt(3), 1e-9)
        assertEquals(0.0, afterglowAt(12), 1e-9)
    }

    @Test
    fun `the next flip is the real dusk, to the minute`() {
        val berlin = ZoneId.of("Europe/Berlin")
        val noon = ZonedDateTime.of(2026, 6, 21, 12, 0, 0, 0, berlin).toInstant().toEpochMilli()
        val flip = assertNotNull(WidgetSun.nextNightFlip(noon, berlin))
        // Night (4° below the horizon) on a Berlin midsummer evening: ~22:05.
        val local = java.time.Instant.ofEpochMilli(flip).atZone(berlin)
        assertTrue(local.hour == 21 || local.hour == 22, "dusk at $local")
        assertTrue(WidgetSun.momentAt(flip, berlin).isNight, "night at the flip")
        assertFalse(WidgetSun.momentAt(flip - 60_000L, berlin).isNight, "day a minute before")
    }

    @Test
    fun `nightfall ends when the afterglow drains, to the minute`() {
        val berlin = ZoneId.of("Europe/Berlin")
        val dusk = ZonedDateTime.of(2026, 10, 17, 18, 40, 0, 0, berlin).toInstant().toEpochMilli()
        assertEquals(WidgetSky.NIGHTFALL, WidgetSky.forMoment(WidgetSun.momentAt(dusk, berlin)))
        val end = assertNotNull(WidgetSun.nextNightfallFlip(dusk, berlin))
        // The app's own sky crosses the threshold at 19:33 that evening.
        val local = java.time.Instant.ofEpochMilli(end).atZone(berlin)
        assertEquals(19, local.hour)
        assertTrue(local.minute in 32..34, "nightfall ends at $local")
        assertEquals(WidgetSky.NIGHT, WidgetSky.forMoment(WidgetSun.momentAt(end, berlin)))
        assertEquals(
            WidgetSky.NIGHTFALL,
            WidgetSky.forMoment(WidgetSun.momentAt(end - 60_000L, berlin)),
        )
    }

    @Test
    fun `a sky that never darkens has no flip`() {
        // Svalbard at midsummer: the sun never gets 4° below the horizon.
        val svalbard = ZoneId.of("Arctic/Longyearbyen")
        val t = ZonedDateTime.of(2026, 6, 21, 12, 0, 0, 0, svalbard).toInstant().toEpochMilli()
        assertNull(WidgetSun.nextNightFlip(t, svalbard))
    }

    @Test
    fun `the sky face follows the moment, and night is always one of the dark skies`() {
        assertEquals(WidgetSky.NIGHT, WidgetSky.forMoment(WidgetSun.Moment(true, 12.0, true)))
        assertEquals(
            WidgetSky.NIGHTFALL,
            WidgetSky.forMoment(WidgetSun.Moment(true, 19.0, true, afterglow = 0.8)),
        )
        // Afterglow only ever colours the night: a day moment ignores it.
        assertEquals(
            WidgetSky.DUSK,
            WidgetSky.forMoment(WidgetSun.Moment(false, 18.9, true, afterglow = 0.8)),
        )
        assertEquals(WidgetSky.DAWN, WidgetSky.forMoment(WidgetSun.Moment(false, 6.0, true)))
        assertEquals(WidgetSky.MORNING, WidgetSky.forMoment(WidgetSun.Moment(false, 9.0, true)))
        assertEquals(WidgetSky.MIDDAY, WidgetSky.forMoment(WidgetSun.Moment(false, 13.0, true)))
        assertEquals(WidgetSky.AFTERNOON, WidgetSky.forMoment(WidgetSun.Moment(false, 17.2, true)))
        assertEquals(WidgetSky.DUSK, WidgetSky.forMoment(WidgetSun.Moment(false, 18.9, true)))
    }
}

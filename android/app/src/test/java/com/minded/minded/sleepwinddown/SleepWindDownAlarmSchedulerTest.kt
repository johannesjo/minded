package com.minded.minded.sleepwinddown

import com.minded.minded.util.UserCfg
import org.junit.Test
import java.util.Calendar
import kotlin.test.assertEquals

class SleepWindDownAlarmSchedulerTest {
    @Test
    fun `computeNextBedtime fires immediately inside active window`() {
        val now = millisAt(2026, Calendar.MAY, 1, 23, 0)

        assertEquals(
            now + 5_000L,
            SleepWindDownAlarmScheduler.computeNextBedtime(defaultCfg(), now)
        )
    }

    @Test
    fun `computeNextFutureBedtime skips current active window`() {
        val now = millisAt(2026, Calendar.MAY, 1, 23, 0)
        val tomorrowBedtime = millisAt(2026, Calendar.MAY, 2, 22, 0)

        assertEquals(
            tomorrowBedtime,
            SleepWindDownAlarmScheduler.computeNextFutureBedtime(defaultCfg(), now)
        )
    }

    private fun defaultCfg(): UserCfg =
        UserCfg(
            isOnboardingComplete = true,
            blockedHosts = emptyList(),
            blockedApps = emptyList(),
            focusSchedule = null,
            soundEnabled = null,
            sleepWindDown = mapOf(
                "enabled" to true,
                "days" to (0..6).associate { dayIdx ->
                    dayIdx.toString() to mapOf(
                        "start" to "22:00",
                        "end" to "07:00"
                    )
                }
            )
        )

    private fun millisAt(
        year: Int,
        month: Int,
        day: Int,
        hour: Int,
        minute: Int,
    ): Long =
        Calendar.getInstance().apply {
            clear()
            set(year, month, day, hour, minute)
        }.timeInMillis
}

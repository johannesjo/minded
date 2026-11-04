package com.minded.minded.overlay.data

import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.Instant

class SharedOverlayViewModelTest {

    private val longAgo = Instant.now().minusSeconds(3600)

    @Test
    fun `resetting a session resets the named app, not the current one`() {
        // The last app shown is TikTok; Instagram is being opened after a long
        // gap with its grace used up. Its reset must not land on TikTok.
        val vm = SharedOverlayViewModel(
            SharedOverlayData(
                currentApp = "tiktok",
                appMap = mapOf(
                    "tiktok" to AppEntry(sessionDurationInS = 120, unlockedSessionS = 120),
                    "instagram" to AppEntry(
                        lastUsed = longAgo,
                        sessionDurationInS = 700,
                        unlockedSessionS = 600,
                    ),
                ),
            )
        )

        vm.resetSession("instagram")

        val map = vm.sharedData.value.appMap
        assertEquals(0, map.getValue("instagram").sessionDurationInS)
        assertEquals(0, map.getValue("instagram").unlockedSessionS)
        assertEquals(120, map.getValue("tiktok").sessionDurationInS)
        assertEquals(120, map.getValue("tiktok").unlockedSessionS)
        assertEquals("tiktok", vm.sharedData.value.currentApp)
    }

    @Test
    fun `resetting an app with no entry changes nothing`() {
        val data = SharedOverlayData(currentApp = null)
        val vm = SharedOverlayViewModel(data)

        vm.resetSession("instagram")

        assertEquals(data, vm.sharedData.value)
    }

    @Test
    fun `a session end time lands on the named app, not the current one`() {
        val end = Instant.now().plusSeconds(300)
        val vm = SharedOverlayViewModel(
            SharedOverlayData(currentApp = "tiktok", appMap = mapOf("tiktok" to AppEntry()))
        )

        vm.updateSessionEndTime("instagram", end)

        assertEquals(end, vm.sharedData.value.appMap.getValue("instagram").sessionEndTime)
        assertEquals(null, vm.sharedData.value.appMap.getValue("tiktok").sessionEndTime)
    }
}

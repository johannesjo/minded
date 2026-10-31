package com.minded.minded.util

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LittleSunGlintTest {

    private val every = LITTLE_SUN_GLINT_DEFAULT_MINUTES * 60

    @Test
    fun `glints once each interval, never at the start`() {
        assertFalse(isLittleSunGlintDue(0, every, null))
        assertFalse(isLittleSunGlintDue(every - 1, every, null))
        assertTrue(isLittleSunGlintDue(every, every, null))
        assertFalse(isLittleSunGlintDue(every + 1, every, null))
        assertTrue(isLittleSunGlintDue(every * 2, every, null))
    }

    @Test
    fun `stays quiet when the pause is about to come back anyway`() {
        assertFalse(isLittleSunGlintDue(every, every, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S))
        assertFalse(isLittleSunGlintDue(every, every, 0))
        assertTrue(isLittleSunGlintDue(every, every, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S + 1))
    }

    @Test
    fun `follows the chosen interval, and off never glints`() {
        assertEquals(every, littleSunGlintEveryS(null))
        assertEquals(5 * 60, littleSunGlintEveryS(5))
        assertEquals(30 * 60, littleSunGlintEveryS(30))
        // An interval the settings don't offer reads as the default.
        assertEquals(every, littleSunGlintEveryS(7))
        assertNull(littleSunGlintEveryS(0))
        assertFalse(isLittleSunGlintDue(every, null, null))
    }
}

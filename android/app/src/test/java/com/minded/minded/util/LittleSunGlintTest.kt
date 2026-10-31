package com.minded.minded.util

import org.junit.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LittleSunGlintTest {

    @Test
    fun `glints once each interval, never at the start`() {
        assertFalse(isLittleSunGlintDue(0, null))
        assertFalse(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S - 1, null))
        assertTrue(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S, null))
        assertFalse(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S + 1, null))
        assertTrue(isLittleSunGlintDue(LITTLE_SUN_GLINT_EVERY_S * 2, null))
    }

    @Test
    fun `stays quiet when the pause is about to come back anyway`() {
        val due = LITTLE_SUN_GLINT_EVERY_S
        assertFalse(isLittleSunGlintDue(due, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S))
        assertFalse(isLittleSunGlintDue(due, 0))
        assertTrue(isLittleSunGlintDue(due, LITTLE_SUN_GLINT_QUIET_BEFORE_PAUSE_S + 1))
    }
}

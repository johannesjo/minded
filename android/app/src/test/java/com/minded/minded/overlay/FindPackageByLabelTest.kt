package com.minded.minded.overlay

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class FindPackageByLabelTest {

    private val apps = listOf(
        "Kindle" to "com.amazon.kindle",
        "Wikipedia" to "org.wikipedia",
    )

    @Test
    fun `matches the typed label case- and space-insensitively`() {
        assertEquals("com.amazon.kindle", findPackageByLabel("  kindle ", apps))
    }

    @Test
    fun `never guesses on a partial or empty label`() {
        assertNull(findPackageByLabel("Kind", apps))
        assertNull(findPackageByLabel("   ", apps))
    }

    @Test
    fun `refuses an ambiguous name across packages`() {
        assertNull(findPackageByLabel("Notes", listOf("Notes" to "a.notes", "notes" to "b.notes")))
    }

    @Test
    fun `one app with two launcher entries of the same name still matches`() {
        assertEquals("a.notes", findPackageByLabel("Notes", listOf("Notes" to "a.notes", "Notes" to "a.notes")))
    }
}

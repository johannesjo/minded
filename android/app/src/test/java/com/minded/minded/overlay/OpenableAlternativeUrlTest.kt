package com.minded.minded.overlay

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class OpenableAlternativeUrlTest {

    @Test
    fun `keeps a normalised https url`() {
        assertEquals(
            "https://en.wikipedia.org/wiki/Walking",
            parseOpenableAlternativeUrl("https://en.wikipedia.org/wiki/Walking"),
        )
    }

    @Test
    fun `keeps http and trims whitespace`() {
        assertEquals("http://example.com/", parseOpenableAlternativeUrl("  http://example.com/ "))
    }

    @Test
    fun `refuses non-web schemes`() {
        assertNull(parseOpenableAlternativeUrl("javascript:alert(1)"))
        assertNull(parseOpenableAlternativeUrl("intent://scan/#Intent;scheme=zxing;end"))
        assertNull(parseOpenableAlternativeUrl("file:///sdcard/x.html"))
    }

    @Test
    fun `refuses text without a host`() {
        assertNull(parseOpenableAlternativeUrl("go for a walk"))
        assertNull(parseOpenableAlternativeUrl("https://"))
        assertNull(parseOpenableAlternativeUrl(""))
    }
}

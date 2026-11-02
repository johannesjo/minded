package com.minded.minded.overlay

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SessionLimitPayloadTest {

    @Test
    fun `parses JSON payload`() {
        val payload = parseSessionLimitPayload("""{"seconds":60}""")

        assertEquals(60, payload?.seconds)
    }

    @Test
    fun `ignores a legacy intent in the payload`() {
        val payload = parseSessionLimitPayload(
            """{"seconds":300,"intent":{"id":"check_one_thing"}}"""
        )

        assertEquals(300, payload?.seconds)
    }

    @Test
    fun `parses legacy numeric string payload`() {
        val payload = parseSessionLimitPayload("900")

        assertEquals(900, payload?.seconds)
    }

    @Test
    fun `rejects invalid payloads`() {
        assertNull(parseSessionLimitPayload(""))
        assertNull(parseSessionLimitPayload("not-json"))
        assertNull(parseSessionLimitPayload("""{"intent":{"id":"check_one_thing"}}"""))
    }
}

package com.minded.minded.overlay

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SessionLimitPayloadTest {

    @Test
    fun `parses enriched JSON payload`() {
        val payload = parseSessionLimitPayload(
            """
            {
              "seconds": 300,
              "intent": {
                "id": "check_one_thing"
              }
            }
            """.trimIndent()
        )

        assertEquals(300, payload?.seconds)
        assertEquals("check_one_thing", payload?.intent?.id)
    }

    @Test
    fun `parses JSON payload without intent`() {
        val payload = parseSessionLimitPayload("""{"seconds":60}""")

        assertEquals(60, payload?.seconds)
        assertNull(payload?.intent)
    }

    @Test
    fun `parses legacy numeric string payload`() {
        val payload = parseSessionLimitPayload("900")

        assertEquals(900, payload?.seconds)
        assertNull(payload?.intent)
    }

    @Test
    fun `rejects invalid payloads`() {
        assertNull(parseSessionLimitPayload(""))
        assertNull(parseSessionLimitPayload("not-json"))
        assertNull(parseSessionLimitPayload("""{"intent":{"id":"check_one_thing"}}"""))
    }
}

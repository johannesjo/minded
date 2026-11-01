package com.minded.minded.util

import org.json.JSONObject
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ApplySyncDataUpdateTest {

    // Keys the WebView writes but the Kotlin model doesn't know about, plus a
    // stand-in for any field TS adds in the future.
    private val unmodeled = mapOf(
        "sunTapTimestamps" to """[1700000000000,1700000100000]""",
        "lastInteractionMode" to """"BREATHING"""",
        "usageStats" to """{"2026-11-03":{"youtube.com":{"seconds":120,"visits":3}}}""",
        "someFutureKey" to """{"nested":[1,"two",null,{"x":1.5}]}""",
    )

    private val stored = """
        {
          "cfg": {"isOnboardingComplete": true, "blockedHosts": [], "blockedApps": ["com.x"]},
          "answers": [],
          "sunTaps": {"2026-11-03": 2},
          "attempts": {},
          "sleepWindDownSnoozeUntilTS": 0,
          ${unmodeled.entries.joinToString(",\n") { (k, v) -> "\"$k\": $v" }}
        }
    """.trimIndent()

    private fun assertUnmodeledSurvive(result: JSONObject) {
        unmodeled.forEach { (key, value) ->
            assertTrue(result.has(key), "$key was dropped")
            assertEquals(JSONObject("{\"v\":$value}").get("v").toString(), result.get(key).toString(), key)
        }
    }

    @Test
    fun `setting then clearing activeTimer keeps keys the model doesn't know`() {
        val timer = ActiveTimer(
            endTS = 1700000900000,
            durationS = 300,
            startedTS = 1700000600000,
            target = SessionTarget("app", "com.x"),
            platform = "android",
        )

        val started = JSONObject(applySyncDataUpdate(stored) { copy(activeTimer = timer) })
        assertUnmodeledSurvive(started)
        assertEquals(1700000900000, started.getJSONObject("activeTimer").getLong("endTS"))
        assertEquals("com.x", started.getJSONObject("activeTimer").getJSONObject("target").getString("id"))

        val cleared = JSONObject(applySyncDataUpdate(started.toString()) { copy(activeTimer = null) })
        assertUnmodeledSurvive(cleared)
        assertFalse(cleared.has("activeTimer"))
    }

    @Test
    fun `an update writes only the keys it changed`() {
        val result = JSONObject(applySyncDataUpdate(stored) { copy(sleepWindDownSnoozeUntilTS = 42L) })

        assertUnmodeledSurvive(result)
        assertEquals(42L, result.getLong("sleepWindDownSnoozeUntilTS"))
        // Untouched modelled keys keep their stored shape instead of being
        // re-normalised from the model (no defaults filled in).
        assertEquals(JSONObject(stored).getJSONObject("cfg").toString(), result.getJSONObject("cfg").toString())
        val expectedKeys = JSONObject(stored).keySet()
        assertEquals(expectedKeys, result.keySet())
    }
}

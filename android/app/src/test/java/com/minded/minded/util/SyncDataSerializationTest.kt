package com.minded.minded.util

import org.json.JSONObject
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class SyncDataSerializationTest {

    @Test
    fun `parses old active timer shape`() {
        val syncData = parseSyncData(
            """
            {
              "cfg": {
                "isOnboardingComplete": false,
                "blockedHosts": [],
                "blockedApps": []
              },
              "answers": [],
              "sunTaps": {},
              "attempts": {},
              "activeTimer": {
                "endTS": 123456,
                "durationS": 300
              }
            }
            """.trimIndent()
        )

        val activeTimer = syncData.activeTimer
        assertEquals(123456L, activeTimer?.endTS)
        assertEquals(300, activeTimer?.durationS)
        assertNull(activeTimer?.startedTS)
        assertNull(activeTimer?.target)
        assertNull(activeTimer?.platform)
        assertNull(activeTimer?.intent)
    }

    @Test
    fun `round trips enriched active timer and sleep wind down drafts`() {
        val syncData = parseSyncData(
            """
            {
              "cfg": {
                "isOnboardingComplete": false,
                "blockedHosts": [],
                "blockedApps": []
              },
              "answers": [],
              "sunTaps": {},
              "attempts": {},
              "activeTimer": {
                "endTS": 987654,
                "durationS": 900,
                "startedTS": 987000,
                "target": {
                  "kind": "app",
                  "id": "com.example.app"
                },
                "platform": "android",
                "intent": {
                  "id": "check_one_thing"
                }
              },
              "sleepWindDownBrainDumpDraft": "brain",
              "sleepWindDownGratitudeDraft": "gratitude",
              "sleepWindDownTomorrowDraft": "tomorrow"
            }
            """.trimIndent()
        )

        assertEquals(987000L, syncData.activeTimer?.startedTS)
        assertEquals("app", syncData.activeTimer?.target?.kind)
        assertEquals("com.example.app", syncData.activeTimer?.target?.id)
        assertEquals("android", syncData.activeTimer?.platform)
        assertEquals("check_one_thing", syncData.activeTimer?.intent?.id)

        val serialized = JSONObject(syncDataToJson(syncData))
        val timer = serialized.getJSONObject("activeTimer")
        val target = timer.getJSONObject("target")
        val intent = timer.getJSONObject("intent")

        assertEquals(987654L, timer.getLong("endTS"))
        assertEquals(900, timer.getInt("durationS"))
        assertEquals(987000L, timer.getLong("startedTS"))
        assertEquals("app", target.getString("kind"))
        assertEquals("com.example.app", target.getString("id"))
        assertEquals("android", timer.getString("platform"))
        assertEquals("check_one_thing", intent.getString("id"))
        assertEquals("brain", serialized.getString("sleepWindDownBrainDumpDraft"))
        assertEquals("gratitude", serialized.getString("sleepWindDownGratitudeDraft"))
        assertEquals("tomorrow", serialized.getString("sleepWindDownTomorrowDraft"))
    }
}

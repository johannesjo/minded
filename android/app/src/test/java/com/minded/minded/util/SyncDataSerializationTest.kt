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
        assertEquals(emptyList(), syncData.alternatives)
        assertEquals(emptyMap(), syncData.patternInsightState.shownInsightIdsByDate)
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

    @Test
    fun `round trips pattern insight state`() {
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
              "patternInsightState": {
                "shownInsightIdsByDate": {
                  "2026-05-11": ["return-loop"]
                }
              }
            }
            """.trimIndent()
        )

        assertEquals(
            listOf("return-loop"),
            syncData.patternInsightState.shownInsightIdsByDate["2026-05-11"]
        )

        val serialized = JSONObject(syncDataToJson(syncData))
        val shown = serialized
            .getJSONObject("patternInsightState")
            .getJSONObject("shownInsightIdsByDate")
            .getJSONArray("2026-05-11")
        assertEquals("return-loop", shown.getString(0))
    }

    @Test
    fun `round trips structured alternatives and keeps legacy arrays`() {
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
              "alternativeApps": ["Reader"],
              "alternativeWebsites": ["https://example.com"],
              "alternatives": [
                {
                  "id": "alt-website",
                  "kind": "website",
                  "label": "Example",
                  "url": "https://example.org",
                  "createdTS": 100,
                  "lastShownTS": 200,
                  "shownCount": 2,
                  "dismissedCount": 1,
                  "openedCount": 3,
                  "disabledTS": 300
                },
                {
                  "id": "alt-app",
                  "kind": "app",
                  "label": "Reader",
                  "packageName": "com.example.reader",
                  "createdTS": 400,
                  "shownCount": 0,
                  "dismissedCount": 0,
                  "openedCount": 0
                }
              ]
            }
            """.trimIndent()
        )

        assertEquals(listOf("Reader"), syncData.alternativeApps)
        assertEquals(listOf("https://example.com"), syncData.alternativeWebsites)
        assertEquals(2, syncData.alternatives.size)
        assertEquals("alt-website", syncData.alternatives[0].id)
        assertEquals("website", syncData.alternatives[0].kind)
        assertEquals("Example", syncData.alternatives[0].label)
        assertEquals("https://example.org", syncData.alternatives[0].url)
        assertEquals(100L, syncData.alternatives[0].createdTS)
        assertEquals(200L, syncData.alternatives[0].lastShownTS)
        assertEquals(2, syncData.alternatives[0].shownCount)
        assertEquals(1, syncData.alternatives[0].dismissedCount)
        assertEquals(3, syncData.alternatives[0].openedCount)
        assertEquals(300L, syncData.alternatives[0].disabledTS)

        val serialized = JSONObject(syncDataToJson(syncData))
        assertEquals("Reader", serialized.getJSONArray("alternativeApps").getString(0))
        assertEquals("https://example.com", serialized.getJSONArray("alternativeWebsites").getString(0))

        val alternatives = serialized.getJSONArray("alternatives")
        assertEquals(2, alternatives.length())
        val website = alternatives.getJSONObject(0)
        assertEquals("alt-website", website.getString("id"))
        assertEquals("website", website.getString("kind"))
        assertEquals("Example", website.getString("label"))
        assertEquals("https://example.org", website.getString("url"))
        assertEquals(100L, website.getLong("createdTS"))
        assertEquals(200L, website.getLong("lastShownTS"))
        assertEquals(2, website.getInt("shownCount"))
        assertEquals(1, website.getInt("dismissedCount"))
        assertEquals(3, website.getInt("openedCount"))
        assertEquals(300L, website.getLong("disabledTS"))

        val app = alternatives.getJSONObject(1)
        assertEquals("alt-app", app.getString("id"))
        assertEquals("com.example.reader", app.getString("packageName"))
        assertEquals(0, app.getInt("shownCount"))
        assertEquals(0, app.getInt("dismissedCount"))
        assertEquals(0, app.getInt("openedCount"))
    }

    @Test
    fun `skips malformed structured alternatives`() {
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
              "alternatives": [
                {
                  "kind": "website",
                  "label": "Missing id",
                  "createdTS": 100,
                  "shownCount": 0,
                  "dismissedCount": 0,
                  "openedCount": 0
                },
                {
                  "id": "valid",
                  "kind": "website",
                  "label": "Valid",
                  "createdTS": 100,
                  "shownCount": 0,
                  "dismissedCount": 0,
                  "openedCount": 0
                }
              ]
            }
            """.trimIndent()
        )

        assertEquals(1, syncData.alternatives.size)
        assertEquals("valid", syncData.alternatives[0].id)
    }
}

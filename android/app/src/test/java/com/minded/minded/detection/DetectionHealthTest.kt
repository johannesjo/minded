package com.minded.minded.detection

import org.json.JSONObject
import kotlin.test.Test
import kotlin.test.assertEquals

class DetectionHealthTest {

    @Test
    fun `serializes both flags under the keys the web shell reads`() {
        val json = JSONObject(DetectionHealth(accessibilityEnabled = true, serviceConnected = false).toJson())
        assertEquals(true, json.getBoolean("accessibilityEnabled"))
        assertEquals(false, json.getBoolean("serviceConnected"))
        assertEquals(setOf("accessibilityEnabled", "serviceConnected"), json.keys().asSequence().toSet())
    }
}

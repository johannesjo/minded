package com.minded.minded.util

import org.json.JSONObject

/**
 * Applies a typed native update to the raw stored sync blob, writing back only
 * the top-level keys the update actually changed. The blob is shared with the
 * WebView, which owns keys the Kotlin model doesn't know (sunTapTimestamps,
 * lastInteractionMode, usageStats, anything added later); rebuilding the blob
 * from the model would silently erase them.
 *
 * "Changed" is decided by serialising the model before and after the update
 * with the same code, so untouched keys compare equal and stay exactly as the
 * WebView stored them. A changed key is rewritten from the model as a whole.
 */
fun applySyncDataUpdate(raw: String, update: SyncData.() -> SyncData): String {
    val stored = JSONObject(raw)
    val syncData = parseSyncData(raw)
    val before = JSONObject(syncDataToJson(syncData))
    val after = JSONObject(syncDataToJson(syncData.update()))

    // The model omits nullable objects it clears (e.g. activeTimer = null).
    before.keys().forEach { key -> if (!after.has(key)) stored.remove(key) }
    after.keys().forEach { key ->
        val value = after.get(key)
        if (!before.has(key) || before.get(key).toString() != value.toString()) {
            stored.put(key, value)
        }
    }
    return stored.toString()
}

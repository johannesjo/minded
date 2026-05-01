package com.minded.minded.util

/**
 * Mutable holder for the latest system-bar + display-cutout insets in
 * CSS pixels. Written by [WebViewSafeAreaBridge] on the UI thread and
 * read from the WebView's JS-bridge thread via the `getSafeAreaInsets()`
 * @JavascriptInterface method.
 */
class SafeAreaInsetsHolder {
    @Volatile var top: Float = 0f
    @Volatile var right: Float = 0f
    @Volatile var bottom: Float = 0f
    @Volatile var left: Float = 0f

    /**
     * Snapshot all four fields locally before formatting so a concurrent
     * write on the UI thread can't produce a torn JSON (new top, old
     * bottom). `Float.toString` is locale-independent on the JVM, so a
     * raw template avoids the JSONObject allocation.
     */
    fun toJsonString(): String {
        val t = top; val r = right; val b = bottom; val l = left
        return """{"top":$t,"right":$r,"bottom":$b,"left":$l}"""
    }
}

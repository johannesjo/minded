package com.minded.minded.util

import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Forwards system-bar + display-cutout insets from the OS into the WebView
 * as `--safe-area-inset-{top|right|bottom|left}` CSS variables on the
 * `#minded-6622` container — mirroring the iOS `capacitor-plugin-safe-area`
 * behavior so existing CSS like `padding-bottom: var(--safe-area-inset-bottom)`
 * works identically on Android.
 *
 * The supplied [SafeAreaInsetsHolder] is updated in lockstep so the page
 * can pull the latest values synchronously on init via the JS interface
 * (the OS may fire its first dispatch after the page has begun parsing,
 * so `evaluateJavascript` alone can race the very first paint).
 *
 * The injected script also dispatches `androidSafeAreaChanged` with the
 * insets in `event.detail`, available for any JS code that wants to react
 * to changes without polling.
 */
object WebViewSafeAreaBridge {
    fun attach(webView: WebView, holder: SafeAreaInsetsHolder) {
        var lastTopPx = Int.MIN_VALUE
        var lastRightPx = Int.MIN_VALUE
        var lastBottomPx = Int.MIN_VALUE
        var lastLeftPx = Int.MIN_VALUE

        ViewCompat.setOnApplyWindowInsetsListener(webView) { v, insetsCompat ->
            val mask = WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout()
            val insets = insetsCompat.getInsets(mask)
            // Skip when nothing relevant changed — `onApplyWindowInsets`
            // can fire per frame during IME / rotation animations.
            if (insets.top == lastTopPx && insets.right == lastRightPx &&
                insets.bottom == lastBottomPx && insets.left == lastLeftPx
            ) {
                return@setOnApplyWindowInsetsListener insetsCompat
            }
            lastTopPx = insets.top
            lastRightPx = insets.right
            lastBottomPx = insets.bottom
            lastLeftPx = insets.left

            val density = v.resources.displayMetrics.density
            holder.top = insets.top / density
            holder.right = insets.right / density
            holder.bottom = insets.bottom / density
            holder.left = insets.left / density

            val js = "(function(){" +
                "var d={top:${holder.top},right:${holder.right},bottom:${holder.bottom},left:${holder.left}};" +
                "var r=document.getElementById('minded-6622');" +
                "if(r){" +
                "r.style.setProperty('--safe-area-inset-top',d.top+'px');" +
                "r.style.setProperty('--safe-area-inset-right',d.right+'px');" +
                "r.style.setProperty('--safe-area-inset-bottom',d.bottom+'px');" +
                "r.style.setProperty('--safe-area-inset-left',d.left+'px');" +
                "}" +
                "window.dispatchEvent(new CustomEvent('androidSafeAreaChanged',{detail:d}));" +
                "})();"
            webView.evaluateJavascript(js, null)
            insetsCompat
        }
        webView.requestApplyInsets()
    }
}

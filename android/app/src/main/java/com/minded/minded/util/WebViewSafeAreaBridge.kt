package com.minded.minded.util

import android.webkit.WebView

/**
 * Forwards system-bar + display-cutout insets to the WebView as
 * `--safe-area-inset-{top|right|bottom|left}` CSS variables on the
 * `#minded-6622` container — mirroring iOS `capacitor-plugin-safe-area`
 * so `padding-bottom: var(--safe-area-inset-bottom)` works identically on
 * both platforms.
 *
 * The insets must be supplied in CSS pixels (DP) by the caller. The
 * canonical caller is [ForwardSafeAreaInsetsToWebView], which reads them
 * from Compose's `WindowInsets.systemBars` + `WindowInsets.displayCutout`
 * — the same source that powers `imePadding`/`statusBarsPadding`. We
 * deliberately don't use `ViewCompat.setOnApplyWindowInsetsListener` on
 * the WebView itself: inside Compose's `AndroidView` interop tree the
 * dispatch path runs through `AndroidViewHolder`, which transforms insets
 * relative to the layout position and can leave the WebView listener with
 * stale or zero values when the WebView is reparented during composition.
 *
 * The supplied [SafeAreaInsetsHolder] is updated in lockstep so the page
 * can pull the latest values synchronously on init via
 * `androidMinded.getSafeAreaInsets()` (boot-race protection — Compose may
 * deliver the first inset update after the page has begun parsing, so
 * `evaluateJavascript` alone can race the very first paint).
 *
 * The injected script also dispatches `androidSafeAreaChanged` with the
 * insets in `event.detail`, available for any JS code that wants to react
 * to changes without polling.
 */
object WebViewSafeAreaBridge {
    fun update(
        webView: WebView,
        holder: SafeAreaInsetsHolder,
        topDp: Float,
        rightDp: Float,
        bottomDp: Float,
        leftDp: Float,
    ) {
        if (holder.top == topDp && holder.right == rightDp &&
            holder.bottom == bottomDp && holder.left == leftDp
        ) {
            return
        }
        holder.top = topDp
        holder.right = rightDp
        holder.bottom = bottomDp
        holder.left = leftDp
        val js = "(function(){" +
            "var d={top:$topDp,right:$rightDp,bottom:$bottomDp,left:$leftDp};" +
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
    }
}

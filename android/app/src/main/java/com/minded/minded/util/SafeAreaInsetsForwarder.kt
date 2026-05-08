package com.minded.minded.util

import android.webkit.WebView
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.union
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalLayoutDirection

/**
 * Reads the current `systemBars` ∪ `displayCutout` insets from Compose's
 * `WindowInsets` state and forwards them to [webView] via
 * [WebViewSafeAreaBridge.update] so the page's `--safe-area-inset-*`
 * CSS variables stay in sync. Re-runs whenever the insets change
 * (rotation, gesture-nav swap, edge-to-edge toggling, etc.). No-ops while
 * [webView] is `null` — the AndroidView factory sets it after first
 * composition.
 */
@Composable
fun ForwardSafeAreaInsetsToWebView(
    webView: WebView?,
    holder: SafeAreaInsetsHolder,
) {
    val insets = WindowInsets.systemBars.union(WindowInsets.displayCutout)
    val density = LocalDensity.current
    val layoutDirection = LocalLayoutDirection.current

    val topDp = insets.getTop(density) / density.density
    val rightDp = insets.getRight(density, layoutDirection) / density.density
    val bottomDp = insets.getBottom(density) / density.density
    val leftDp = insets.getLeft(density, layoutDirection) / density.density

    LaunchedEffect(webView, topDp, rightDp, bottomDp, leftDp) {
        webView?.let {
            WebViewSafeAreaBridge.update(it, holder, topDp, rightDp, bottomDp, leftDp)
        }
    }
}

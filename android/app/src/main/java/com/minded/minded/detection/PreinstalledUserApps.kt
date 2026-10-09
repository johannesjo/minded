package com.minded.minded.detection

/**
 * Apps that often ship preinstalled (FLAG_SYSTEM) but are used like any other
 * app, so they must stay pickable and detectable. Shared by the app picker and
 * the accessibility service's system-package check so the two can't drift: an
 * app the user can pick but detection ignores would silently never intervene.
 */
object PreinstalledUserApps {
    val packages: Set<String> = setOf(
        // YouTube variants
        "com.google.android.youtube",
        "com.google.android.youtube.tv",
        "com.google.android.youtube.tvkids",
        "com.google.android.youtube.kids",
        "com.google.android.apps.youtube.music",
        "com.google.android.apps.youtube.creator",

        // Google apps
        "com.google.android.gm",                    // Gmail
        "com.google.android.googlequicksearchbox",  // Google (search / Discover)

        // Chrome variants
        "com.android.chrome",
        "com.chrome.canary",
        "com.chrome.dev",
        "com.chrome.beta",

        // Other Chromium-based browsers
        "com.microsoft.emmx",           // Edge
        "com.brave.browser",            // Brave
        "com.opera.browser",            // Opera
        "com.opera.mini.native",        // Opera Mini
        "org.chromium.chrome",          // Chromium
        "com.sec.android.app.sbrowser", // Samsung Internet
        "com.UCMobile.intl",            // UC Browser
        "com.vivaldi.browser",          // Vivaldi

        // Social media
        "com.facebook.katana",
        "com.facebook.orca",            // Messenger
        "com.facebook.lite",
        "com.instagram.android",
        "com.instagram.lite",
        "com.whatsapp",
        "com.whatsapp.w4b",             // WhatsApp Business
        "com.twitter.android",
        "com.twitter.android.lite",
        "com.snapchat.android",
        "com.zhiliaoapp.musically",     // TikTok
        "com.ss.android.ugc.trill",     // TikTok
        "com.ss.android.ugc.aweme",     // TikTok (China)
        "com.reddit.frontpage",
        "com.discord",
        "com.linkedin.android",
        "com.pinterest",
        "com.tumblr"
    )
}

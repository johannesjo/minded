package com.minded.minded

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.minded.minded.overlay.OverlayControllerService
import android.content.pm.ApplicationInfo
import com.minded.minded.data.SharedPreferenceService
import com.minded.minded.detection.HybridAppDetector
import com.minded.minded.detection.ConfidenceLevel
import com.minded.minded.detection.DetectionConfidence
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collect
import java.util.Collections


/**
 * Accessibility service that detects app changes and triggers overlays for blocked apps.
 * 
 * This service uses sophisticated pattern recognition to accurately detect when users
 * switch to blocked apps, while filtering out false positives from system UI interactions,
 * notification pulls, and task switching.
 * 
 * Key features:
 * - Dynamic launcher detection using PackageManager
 * - Manufacturer-specific handling for different Android skins
 * - Transition pattern recognition to understand user navigation
 * - Event context validation to filter non-app windows
 * - History-based filtering for system UI interactions
 */
class MyAccessibilityService : AccessibilityService() {
    private var lastPackageName: String? = null
    private var lastEventTimestamp: Long = 0
    private val recentPackageHistory = Collections.synchronizedList(mutableListOf<Pair<String, Long>>())
    private val PACKAGE_HISTORY_SIZE = 5
    private val LAUNCHER_DEBOUNCE_MS: Long by lazy {
        getManufacturerDebounceTime()
    }

    // Track if minded overlay is active to prevent keyboard from closing it
    private var isMindedOverlayActive = false

    // Track when we last triggered overlay for a blocked app (for debouncing launcher events during app startup)
    private var lastBlockedAppOverlayTimestamp: Long = 0
    private var lastBlockedAppOverlayPackage: String? = null
    private val BLOCKED_APP_STARTUP_DEBOUNCE_MS = 1000L // Don't hide for launcher during app startup

    // Dynamic launcher detection
    private var cachedLaunchers: Set<String>? = null
    private var lastLauncherCacheTime = 0L

    // System app detection cache
    private val systemAppCache = mutableMapOf<String, Boolean>()
    private var lastSystemAppCacheClear = 0L

    // Transition pattern tracking
    private data class AppTransition(
        val fromPackage: String?,
        val toPackage: String,
        val timestamp: Long,
        val eventType: String = "window_state_changed",
        val className: String = ""
    )
    private val transitionHistory = Collections.synchronizedList(mutableListOf<AppTransition>())
    private var lastUserApp: String? = null

    // Device manufacturer info
    private val deviceManufacturer: String by lazy {
        Build.MANUFACTURER?.lowercase() ?: "unknown"
    }
    private val deviceModel: String by lazy {
        Build.MODEL?.lowercase() ?: "unknown"
    }

    // Hybrid detection system
    private var hybridDetector: HybridAppDetector? = null
    private val serviceScope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private var detectionCollectionJob: kotlinx.coroutines.Job? = null

    companion object {
        const val INTENT_EXTRA_CURRENT_PACKAGE_NAME = "INTENT_EXTRA_CURRENT_PACKAGE_NAME"
        const val INTENT_EXTRA_HIDE_OVERLAY = "INTENT_EXTRA_HIDE_OVERLAY"
        private const val TAG = "MindedAccessibility"
        private const val LAUNCHER_CACHE_DURATION_MS = 60_000L // 1 minute
        private const val LAUNCHER_DEBOUNCE_DEFAULT_MS = 500L
        private const val SYSTEM_APP_CACHE_DURATION_MS = 300_000L // 5 minutes
        private const val TRANSITION_HISTORY_DURATION_MS = 10_000L // 10 seconds
        private const val TRANSITION_HISTORY_MAX_SIZE = 20
        
        // Transition detection timeouts
        private const val LAUNCHER_TO_APP_TIMEOUT_MS = 2000L
        private const val APP_SWITCH_VIA_LAUNCHER_TIMEOUT_MS = 3000L
        private const val DIRECT_APP_SWITCH_TIMEOUT_MS = 1000L
        private const val RETURNING_TO_APP_TIMEOUT_MS = 5000L
        private const val NOTIFICATION_RETURN_TIMEOUT_MS = 2000L
        
        // Pattern detection thresholds
        private const val RECENT_TRANSITIONS_TO_ANALYZE = 5
        private const val RECENTS_BROWSING_MIN_EVENTS = 2
        private const val RECENTS_BROWSING_WINDOW_SIZE = 3
        
        // Manufacturer-specific packages
        private val SAMSUNG_SYSTEM_PACKAGES = setOf(
            "com.samsung.android.app.taskedge", // Edge panel
            "com.samsung.android.app.cocktailbarservice", // Edge screen
            "com.samsung.android.honeyboard", // Samsung keyboard
            "com.sec.android.app.launcher", // Samsung launcher
            "com.samsung.android.incallui" // Samsung phone UI
        )
        
        private val XIAOMI_SYSTEM_PACKAGES = setOf(
            "com.miui.home", // MIUI launcher
            "com.miui.securitycenter", // MIUI security
            "com.miui.notification", // MIUI notifications
            "com.xiaomi.discover" // MIUI app vault
        )
        
        private val ONEPLUS_SYSTEM_PACKAGES = setOf(
            "net.oneplus.launcher", // OnePlus launcher
            "com.oneplus.systemui", // OnePlus system UI
            "com.oneplus.camera" // OnePlus camera (often used for gestures)
        )
        
        // Known launcher packages as fallback
        private val KNOWN_LAUNCHERS = setOf(
            "com.android.launcher",
            "com.android.launcher2",
            "com.android.launcher3",
            "com.google.android.apps.nexuslauncher",
            "com.google.android.launcher",
            "com.google.android.googlequicksearchbox", // Google app acts as launcher on some devices
            "com.miui.home", // Xiaomi
            "com.sec.android.app.launcher", // Samsung
            "com.oneplus.launcher", // OnePlus
            "com.oppo.launcher", // Oppo
            "com.vivo.launcher", // Vivo
            "com.huawei.android.launcher", // Huawei
            "com.sonyericsson.home", // Sony
            "com.sonymobile.launcher", // Sony newer
            "org.cyanogenmod.trebuchet", // CyanogenMod
            "com.cyanogenmod.trebuchet", // CyanogenMod
            "com.microsoft.launcher", // Microsoft Launcher
            "com.teslacoilsw.launcher", // Nova Launcher
            "com.actionlauncher.playstore", // Action Launcher
            "ch.deletescape.lawnchair.plah", // Lawnchair
            "com.niagara.launcher", // Niagara Launcher
            "com.ss.squarehome2" // Square Home
        )
    }


    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "onCreate()")
        try {
            Log.d(TAG, "Device: $deviceManufacturer - $deviceModel")
            Log.d(TAG, "Debounce time: ${LAUNCHER_DEBOUNCE_MS}ms")
        } catch (e: Exception) {
            Log.e(TAG, "Error accessing device info", e)
        }

        // Clear any stale state on service creation
        lastPackageName = null
        lastEventTimestamp = 0
        recentPackageHistory.clear()
        transitionHistory.clear()
        lastUserApp = null

        // Initialize hybrid detection system
        hybridDetector = HybridAppDetector(this).apply {
            healthMonitor.setOnUnhealthyCallback {
                Log.e(TAG, "Service health monitor detected unhealthy state")
                // Could notify user or attempt recovery here
            }
        }

        // Set up blocked apps checker for fallback detection
        // This enables UsageStatsManager to trigger interventions for blocked apps
        // that don't generate accessibility events (e.g., games with OpenGL splash screens)
        val sharedPreferenceService = SharedPreferenceService(this)
        hybridDetector?.setBlockedAppChecker { packageName ->
            val blockedApps = sharedPreferenceService.getBlockedApps()
            // Match OverlayControllerService.isBlockedPackage() logic
            if (blockedApps.isEmpty()) {
                packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
            } else {
                blockedApps.contains(packageName)
            }
        }

        // Register broadcast receiver for home action
        val filter = android.content.IntentFilter("com.minded.ACTION_GO_HOME")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(homeActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(homeActionReceiver, filter)
        }
    }
    
    private val homeActionReceiver = object : android.content.BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "Received ACTION_GO_HOME broadcast")
            performGlobalAction(GLOBAL_ACTION_HOME)
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "onInterrupt()")
    }

    override fun onUnbind(intent: Intent?): Boolean {
        Log.d(TAG, "onUnbind()")
        return super.onUnbind(intent)
    }
    
    override fun onDestroy() {
        super.onDestroy()

        // Stop detection collection job first
        detectionCollectionJob?.cancel()
        detectionCollectionJob = null

        // Stop hybrid detection system
        hybridDetector?.stop()
        hybridDetector = null
        serviceScope.cancel()
        Log.d(TAG, "Hybrid detection system stopped")

        try {
            unregisterReceiver(homeActionReceiver)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to unregister receiver", e)
        }
    }


    override fun onServiceConnected() {
        Log.d(TAG, "onServiceConnected()")
        super.onServiceConnected()

        // Configure the service programmatically to ensure it works reliably
        val config = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
            // Monitor all packages
            packageNames = null
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        }
        serviceInfo = config

        // Start hybrid detection system
        hybridDetector?.start()
        Log.d(TAG, "Hybrid detection system started")

        // Subscribe to validated detections from the hybrid detector
        // This is the SINGLE SOURCE OF TRUTH for triggering the overlay
        // Cancel any existing job first to prevent duplicate collectors on service reconnect
        detectionCollectionJob?.cancel()
        detectionCollectionJob = serviceScope.launch {
            hybridDetector?.validatedDetections?.collect { detection ->
                Log.d(TAG, "Received validated detection: ${detection.packageName} (confidence: ${detection.confidence.overall})")
                triggerOverlay(detection.packageName)
            }
        }

        // Ensure OverlayControllerService is running
        ensureOverlayServiceRunning()
    }
    
    private fun ensureOverlayServiceRunning() {
        try {
            val intent = Intent(this, OverlayControllerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            Log.d(TAG, "Started OverlayControllerService")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start OverlayControllerService", e)
        }
    }

    private fun triggerOverlay(packageName: String) {
        Log.d(TAG, "Triggering overlay for package: $packageName")

        // Track when we trigger overlay for user apps coming from launcher
        // This helps debounce spurious launcher events during slow app startups
        // Only set timestamp when coming FROM launcher (initial app launch)
        if (!isSystemPackage(packageName) && !isLauncherPackage(packageName)) {
            val comingFromLauncher = lastPackageName != null && isLauncherPackage(lastPackageName!!)
            if (comingFromLauncher) {
                lastBlockedAppOverlayTimestamp = System.currentTimeMillis()
                lastBlockedAppOverlayPackage = packageName
                Log.d(TAG, "Setting startup debounce for $packageName (launched from launcher)")
            }
        }

        try {
            val intent = Intent(this, OverlayControllerService::class.java).apply {
                putExtra(INTENT_EXTRA_CURRENT_PACKAGE_NAME, packageName)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start OverlayControllerService for package: $packageName", e)
            // Try to ensure service is running and retry
            ensureOverlayServiceRunning()
            Handler(Looper.getMainLooper()).postDelayed({
                try {
                    val retryIntent = Intent(this, OverlayControllerService::class.java).apply {
                        putExtra(INTENT_EXTRA_CURRENT_PACKAGE_NAME, packageName)
                    }
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(retryIntent)
                    } else {
                        startService(retryIntent)
                    }
                } catch (retryException: Exception) {
                    Log.e(TAG, "Retry failed for package: $packageName", retryException)
                }
            }, 500)
        }
    }

    private fun isSystemPackage(packageName: String): Boolean {
        // Check cache first
        val currentTime = System.currentTimeMillis()
        
        // Clear cache periodically
        if (currentTime - lastSystemAppCacheClear > SYSTEM_APP_CACHE_DURATION_MS) {
            systemAppCache.clear()
            lastSystemAppCacheClear = currentTime
        }
        
        // Return cached result if available
        systemAppCache[packageName]?.let { return it }
        
        // Check if it's our own package
        if (packageName == "com.minded.minded") {
            systemAppCache[packageName] = true
            return true
        }
        
        // Check if it's a launcher (launchers are considered system packages for our purposes)
        if (isLauncherPackage(packageName)) {
            systemAppCache[packageName] = true
            return true
        }
        
        // Apps that should NEVER be considered system packages (even if pre-installed)
        val userAppsWhitelist = setOf(
            // YouTube variants
            "com.google.android.youtube",
            "com.google.android.youtube.tv",
            "com.google.android.youtube.tvkids",
            "com.google.android.youtube.kids",
            "com.google.android.apps.youtube.music",
            "com.google.android.apps.youtube.creator",

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
        
        if (userAppsWhitelist.contains(packageName)) {
            systemAppCache[packageName] = false
            return false
        }
        
        val isSystem = try {
            // Get application info
            val appInfo = packageManager.getApplicationInfo(packageName, 0)
            
            // Check if it's a system app
            val isSystemApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0 ||
                             (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
            
            // Additional checks for known system components
            if (isSystemApp) {
                true
            } else {
                when {
                    // System UI components
                    packageName.startsWith("com.android.systemui") -> true
                    packageName == "android" -> true
                    
                    // Input methods
                    packageName.contains("inputmethod") -> true
                    packageName.contains("keyboard") -> true
                    
                    // Settings and installers
                    packageName.startsWith("com.android.settings") -> true
                    packageName.startsWith("com.android.packageinstaller") -> true
                    packageName.startsWith("com.android.permissioncontroller") -> true
                    
                    // Lock screens and security
                    packageName.contains("keyguard") -> true
                    packageName.contains("lockscreen") -> true
                    
                    // Accessibility services (but not user-installed ones)
                    packageName.contains("talkback") && packageName.startsWith("com.google") -> true
                    
                    // Recent apps / task switcher
                    packageName.contains("recent") && packageName.startsWith("com.android") -> true
                    
                    // Notification shade
                    packageName.contains("notification") && packageName.startsWith("com.android") -> true
                    
                    // Quick settings
                    packageName.contains("quicksetting") -> true
                    
                    // Manufacturer-specific system packages
                    isManufacturerSystemPackage(packageName) -> true
                    
                    else -> false
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get ApplicationInfo for $packageName", e)
            // Fall back to simple pattern matching for unknown packages
            packageName.startsWith("com.android.") || 
            packageName.startsWith("com.google.android.system")
        }
        
        // Cache the result
        systemAppCache[packageName] = isSystem
        
        if (isSystem) {
            Log.d(TAG, "Identified system package: $packageName")
        }
        
        return isSystem
    }
    
    private fun isManufacturerSystemPackage(packageName: String): Boolean {
        return when (deviceManufacturer) {
            "samsung" -> {
                SAMSUNG_SYSTEM_PACKAGES.contains(packageName) ||
                packageName.startsWith("com.samsung.android.") ||
                packageName.startsWith("com.sec.android.")
            }
            
            "xiaomi" -> {
                XIAOMI_SYSTEM_PACKAGES.contains(packageName) ||
                packageName.startsWith("com.miui.") ||
                packageName.startsWith("com.xiaomi.")
            }
            
            "oneplus", "oppo" -> {
                ONEPLUS_SYSTEM_PACKAGES.contains(packageName) ||
                packageName.startsWith("com.oneplus.") ||
                packageName.startsWith("com.oppo.") ||
                packageName.startsWith("net.oneplus.")
            }
            
            "huawei", "honor" -> {
                packageName.startsWith("com.huawei.") ||
                packageName.startsWith("com.honor.")
            }
            
            "vivo" -> {
                packageName.startsWith("com.vivo.") ||
                packageName.startsWith("com.bbk.")
            }
            
            "realme" -> {
                packageName.startsWith("com.realme.") ||
                packageName.startsWith("com.oppo.")
            }
            
            "motorola" -> {
                packageName.startsWith("com.motorola.")
            }
            
            "sony" -> {
                packageName.startsWith("com.sonymobile.") ||
                packageName.startsWith("com.sonyericsson.")
            }
            
            "lg" -> {
                packageName.startsWith("com.lge.")
            }
            
            else -> false
        }
    }
    
    private fun getManufacturerDebounceTime(): Long {
        return when (deviceManufacturer) {
            "samsung" -> 600L // Samsung devices often have slower animations
            "xiaomi" -> 700L // MIUI has heavy animations
            "oneplus" -> 400L // OnePlus is generally snappy
            "oppo", "vivo", "realme" -> 600L // ColorOS/OriginOS can be slower
            "huawei", "honor" -> 600L // EMUI/MagicUI animations
            else -> LAUNCHER_DEBOUNCE_DEFAULT_MS // Default 500ms
        }
    }
    
    private fun isLauncherPackage(packageName: String): Boolean {
        // Use dynamic detection with fallback to known launchers
        return getInstalledLaunchers().contains(packageName)
    }
    
    private fun getInstalledLaunchers(): Set<String> {
        val currentTime = System.currentTimeMillis()
        
        // Return cached launchers if still valid
        if (cachedLaunchers != null && 
            currentTime - lastLauncherCacheTime < LAUNCHER_CACHE_DURATION_MS) {
            return cachedLaunchers!!
        }
        
        // Detect launchers dynamically
        val launchers = mutableSetOf<String>()
        
        try {
            // Query for all apps that can handle the home intent
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
            }
            
            val resolveInfos = packageManager.queryIntentActivities(
                homeIntent,
                android.content.pm.PackageManager.MATCH_DEFAULT_ONLY
            )
            
            resolveInfos.forEach { resolveInfo ->
                launchers.add(resolveInfo.activityInfo.packageName)
                Log.d(TAG, "Detected launcher: ${resolveInfo.activityInfo.packageName}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to query launchers dynamically", e)
        }
        
        // Add known launchers as fallback
        launchers.addAll(KNOWN_LAUNCHERS)
        
        // Cache the results
        cachedLaunchers = launchers
        lastLauncherCacheTime = currentTime
        
        Log.d(TAG, "Total launchers detected: ${launchers.size}")
        return launchers
    }
    
    private fun isValidAppWindow(className: String, eventText: String, contentDesc: String): Boolean {
        // Filter out non-activity windows
        val lowerClassName = className.lowercase()
        
        // Skip if it's a dialog, popup, or menu
        if (lowerClassName.contains("dialog") ||
            lowerClassName.contains("popup") ||
            lowerClassName.contains("menu") ||
            lowerClassName.contains("toast")) {
            return false
        }
        
        // Skip if it's a system overlay or notification
        if (lowerClassName.contains("notification") ||
            lowerClassName.contains("statusbar") ||
            lowerClassName.contains("navigationbar")) {
            return false
        }
        
        // Skip keyboard and input method windows
        if (lowerClassName.contains("inputmethod") ||
            lowerClassName.contains("keyboard")) {
            return false
        }
        
        // Accept if it looks like an activity
        if (className.endsWith("Activity") ||
            className.contains("MainActivity") ||
            className.contains("LauncherActivity")) {
            return true
        }
        
        // Accept if it's a common view container that typically represents main content
        if (className.endsWith("FrameLayout") ||
            className.endsWith("CoordinatorLayout") ||
            className.endsWith("ConstraintLayout") ||
            className.endsWith("LinearLayout") ||
            className.endsWith("RelativeLayout")) {
            // But only if it doesn't look like a system UI element
            if (!contentDesc.lowercase().contains("status") &&
                !contentDesc.lowercase().contains("navigation")) {
                return true
            }
        }
        
        // Accept WebView as it often represents main app content
        if (className.contains("WebView")) {
            return true
        }
        
        // Accept RecyclerView/ListView as they often represent main app content
        if (className.contains("RecyclerView") ||
            className.contains("ListView")) {
            return true
        }
        
        // If we can't determine, be conservative and accept it
        return true
    }


    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        try {
            val packageName = event.packageName?.toString() ?: return
            val currentTime = System.currentTimeMillis()

            // Record event with health monitor
            hybridDetector?.healthMonitor?.recordEvent()

            // Extract event context for better validation
            val className = event.className?.toString() ?: ""
            val eventText = event.text.joinToString(" ")
            val contentDesc = event.contentDescription?.toString() ?: ""

            Log.d(TAG, "onAccessibilityEvent: package=$packageName, class=$className, lastPackage=$lastPackageName")
            
            // Track if minded overlay is active
            if (packageName == "com.minded.minded") {
                // Check if this is an overlay window (InteractionWindow)
                if (className.contains("InteractionWindow") || 
                    className.contains("WebView") ||
                    event.toString().contains("InteractionWindow")) {
                    isMindedOverlayActive = true
                    Log.d(TAG, "Minded overlay is now active")
                }
            }
            
            // Skip keyboard/input method events when our overlay is active
            if (isMindedOverlayActive && 
                (packageName.contains("inputmethod") || 
                 packageName.contains("keyboard") ||
                 className.lowercase().contains("inputmethod") || 
                 className.lowercase().contains("keyboard"))) {
                Log.d(TAG, "Ignoring keyboard event while minded overlay is active")
                return
            }
            
            // Check if we're leaving a blocked app OR our overlay (before updating lastPackageName)
            // Only hide overlay if we're moving to a non-blocked app or system app
            val isLeavingBlockedApp = lastPackageName != null && 
                                      !isSystemPackage(lastPackageName!!) && 
                                      !isLauncherPackage(lastPackageName!!)
            val isLeavingOverlay = lastPackageName == "com.minded.minded"
            
            if (lastPackageName != null && 
                lastPackageName != packageName && 
                packageName != "com.minded.minded" &&  // Don't process when moving TO our overlay
                (isLeavingBlockedApp || isLeavingOverlay)) {
                
                // Don't hide overlay when transitioning to keyboard/input method
                if (packageName.contains("inputmethod") || 
                    packageName.contains("keyboard") ||
                    className.lowercase().contains("inputmethod") ||
                    className.lowercase().contains("keyboard") ||
                    className.lowercase().contains("softinput")) {
                    Log.d(TAG, "Ignoring transition to keyboard/input method: $lastPackageName -> $packageName")
                    return
                }
                
                // Check if the new app is also blocked before hiding overlay
                // This prevents hiding overlay when switching between blocked apps
                if (isSystemPackage(packageName) || isLauncherPackage(packageName)) {
                    // Don't hide overlay for notification shade or quick settings
                    // User is still "in" the app, just interacting with system UI
                    if (isOverlayCompatibleSystemUI(packageName, className)) {
                        Log.d(TAG, "Transitioning to overlay-compatible system UI, keeping overlay: $lastPackageName -> $packageName ($className)")
                    } else {
                        // Check if we recently triggered overlay for this specific app
                        // This prevents hiding during slow app startups where launcher briefly appears
                        val timeSinceBlockedAppOverlay = System.currentTimeMillis() - lastBlockedAppOverlayTimestamp
                        val isSameAppAsOverlayTrigger = lastPackageName == lastBlockedAppOverlayPackage
                        if (isSameAppAsOverlayTrigger && timeSinceBlockedAppOverlay < BLOCKED_APP_STARTUP_DEBOUNCE_MS) {
                            Log.d(TAG, "Skipping hide for launcher - recently triggered overlay for $lastBlockedAppOverlayPackage (${timeSinceBlockedAppOverlay}ms ago)")
                        } else {
                            // Moving to system/launcher, safe to hide overlay
                            Log.d(TAG, "Previous app/overlay going to background, moving to system/launcher: $lastPackageName -> $packageName")
                            hideOverlayForBackgroundedApp()
                        }
                    }
                } else {
                    // Moving to another user app, trigger overlay check
                    // This ensures blocked apps show the overlay even if pattern detection filters it out
                    Log.d(TAG, "Switching between user apps: $lastPackageName -> $packageName")
                    triggerOverlay(packageName)
                }
            }

            // Handle transition from system UI (notification shade, quick settings) to user app
            // This catches the case where user taps a notification to open an unblocked app
            // while the overlay is showing for a blocked app
            // Important: exclude launcher as source - we only want notification shade, quick settings, etc.
            // We use triggerOverlay instead of hideOverlayForBackgroundedApp so that
            // checkToShowOverlay can decide based on whether the app is blocked or not
            if (lastPackageName != null &&
                isSystemPackage(lastPackageName!!) &&
                !isLauncherPackage(lastPackageName!!) &&
                !isSystemPackage(packageName) &&
                !isLauncherPackage(packageName) &&
                packageName != "com.minded.minded") {
                Log.d(TAG, "Exiting system UI to user app: $packageName, triggering overlay check")
                triggerOverlay(packageName)
            }

            // Skip if this is a system package (but don't update lastPackageName for keyboards)
            if (isSystemPackage(packageName)) {
                Log.d(TAG, "Skipping system package: $packageName")
                // Don't update lastPackageName for keyboard/input method packages
                if (!packageName.contains("inputmethod") && !packageName.contains("keyboard")) {
                    lastPackageName = packageName
                }
                return
            }
            
            // Validate this is a genuine app window
            if (!isValidAppWindow(className, eventText, contentDesc)) {
                Log.d(TAG, "Skipping non-app window: $className")
                return
            }
            
            // Track package history for better launcher detection
            updatePackageHistory(packageName, currentTime)
            
            // Track transition
            trackTransition(packageName, currentTime, className)
            
            // Analyze pattern and confidence to feed the hybrid detector
            val (shouldTrigger, confidence) = shouldTriggerOverlayWithConfidence(packageName, currentTime)
            
            if (shouldTrigger) {
                 val pattern = analyzeTransitionPattern(packageName, currentTime)
                 serviceScope.launch {
                     hybridDetector?.onAccessibilityEvent(
                         packageName = packageName,
                         pattern = pattern.name,
                         patternConfidence = getPatternConfidence(pattern)
                     )
                 }
            } else {
                // Even if we wouldn't trigger, it might be useful to inform the detector
                // but for now we only send candidates that pass the basic accessibility filter
                // to avoid spamming the validation system
                Log.d(TAG, "Filtered out by accessibility logic: $packageName (confidence: ${confidence.overall})")
            }
            
            lastPackageName = packageName
            lastEventTimestamp = currentTime
        } catch (e: SecurityException) {
            // Permission-related issues - log but don't crash
            Log.e(TAG, "Security exception in onAccessibilityEvent - check permissions", e)
        } catch (e: IllegalStateException) {
            // Service in invalid state - attempt to continue
            Log.e(TAG, "Service in invalid state during onAccessibilityEvent", e)
        } catch (e: NullPointerException) {
            // Null safety issue - likely a race condition with event data
            Log.w(TAG, "Null pointer in onAccessibilityEvent - event data may be stale", e)
        } catch (e: Exception) {
            // Unexpected error - log with full context for debugging
            Log.e(TAG, "Unexpected error in onAccessibilityEvent: ${e.javaClass.simpleName}", e)
        }
    }
    
    private fun updatePackageHistory(packageName: String, timestamp: Long) {
        synchronized(recentPackageHistory) {
            recentPackageHistory.add(packageName to timestamp)
            if (recentPackageHistory.size > PACKAGE_HISTORY_SIZE) {
                recentPackageHistory.removeAt(0)
            }
        }
    }
    
    private fun trackTransition(toPackage: String, timestamp: Long, className: String = "") {
        val transition = AppTransition(
            fromPackage = lastPackageName,
            toPackage = toPackage,
            timestamp = timestamp,
            className = className
        )
        synchronized(transitionHistory) {
            transitionHistory.add(transition)

            // Clean up old transitions
            val cutoffTime = timestamp - TRANSITION_HISTORY_DURATION_MS
            transitionHistory.removeAll { it.timestamp < cutoffTime }

            // Limit size
            while (transitionHistory.size > TRANSITION_HISTORY_MAX_SIZE) {
                transitionHistory.removeAt(0)
            }
        }

        // Update last user app if this is not a system package
        if (!isSystemPackage(toPackage) && !isLauncherPackage(toPackage)) {
            lastUserApp = toPackage
        }

        Log.d(TAG, "Tracked transition: ${transition.fromPackage} -> ${transition.toPackage}")
    }
    
    /**
     * Analyzes recent transition history to determine the pattern of app switching.
     * This helps differentiate between genuine app launches and system UI interactions.
     * 
     * @param currentPackage The package name of the current window
     * @param currentTime The timestamp of the current event
     * @return The detected transition pattern
     */
    private fun analyzeTransitionPattern(currentPackage: String, currentTime: Long): TransitionPattern {
        if (transitionHistory.isEmpty()) {
            return TransitionPattern.FIRST_APP_LAUNCH
        }
        
        val recentTransitions = synchronized(transitionHistory) {
            transitionHistory.takeLast(RECENT_TRANSITIONS_TO_ANALYZE)
        }
        val lastTransition = recentTransitions.lastOrNull()
        
        // Check for notification shade pattern
        if (detectNotificationShadePattern(recentTransitions, currentPackage, currentTime)) {
            return TransitionPattern.NOTIFICATION_PULL
        }
        
        // Check for recents/task switcher browsing
        if (detectRecentsBrowsingPattern(recentTransitions, currentPackage)) {
            return TransitionPattern.RECENTS_BROWSING
        }
        
        // Check for quick settings pattern
        if (detectQuickSettingsPattern(recentTransitions, currentPackage)) {
            return TransitionPattern.QUICK_SETTINGS_PULL
        }
        
        // Check for launcher -> app pattern (direct app launch)
        if (lastTransition != null && 
            isLauncherPackage(lastTransition.fromPackage ?: "") &&
            !isSystemPackage(currentPackage) &&
            currentTime - lastTransition.timestamp < LAUNCHER_TO_APP_TIMEOUT_MS) {
            return TransitionPattern.LAUNCHER_TO_APP
        }
        
        // Check for app -> launcher -> app pattern (task switching)
        if (recentTransitions.size >= 2) {
            val secondLast = recentTransitions[recentTransitions.size - 2]
            if (!isSystemPackage(secondLast.fromPackage ?: "") &&
                isLauncherPackage(lastTransition?.toPackage ?: "") &&
                !isSystemPackage(currentPackage) &&
                currentTime - secondLast.timestamp < APP_SWITCH_VIA_LAUNCHER_TIMEOUT_MS) {
                return TransitionPattern.APP_SWITCH_VIA_LAUNCHER
            }
        }
        
        // Check for direct app-to-app switch
        if (lastTransition != null &&
            !isSystemPackage(lastTransition.fromPackage ?: "") &&
            !isSystemPackage(currentPackage) &&
            lastTransition.fromPackage != currentPackage &&
            currentTime - lastTransition.timestamp < DIRECT_APP_SWITCH_TIMEOUT_MS) {
            return TransitionPattern.DIRECT_APP_SWITCH
        }
        
        // Check if returning to same app after brief launcher/recents visit
        val sameAppTransitions = recentTransitions.filter { it.toPackage == currentPackage }
        if (sameAppTransitions.isNotEmpty() && 
            currentTime - sameAppTransitions.last().timestamp < RETURNING_TO_APP_TIMEOUT_MS) {
            return TransitionPattern.RETURNING_TO_APP
        }
        
        return TransitionPattern.UNKNOWN
    }
    
    private enum class TransitionPattern {
        FIRST_APP_LAUNCH,
        LAUNCHER_TO_APP,
        APP_SWITCH_VIA_LAUNCHER,
        DIRECT_APP_SWITCH,
        RETURNING_TO_APP,
        NOTIFICATION_PULL,
        RECENTS_BROWSING,
        QUICK_SETTINGS_PULL,
        UNKNOWN
    }
    
    private fun detectNotificationShadePattern(
        transitions: List<AppTransition>, 
        currentPackage: String, 
        currentTime: Long
    ): Boolean {
        // Pattern: App -> SystemUI (notification) -> Same App (within 2 seconds)
        if (transitions.size >= 2) {
            val previous = transitions[transitions.size - 1]
            val beforePrevious = transitions[transitions.size - 2]
            
            if (beforePrevious.toPackage == currentPackage &&
                previous.toPackage.contains("systemui") &&
                (previous.className.lowercase().contains("notification") || 
                 previous.className.lowercase().contains("statusbar")) &&
                currentTime - beforePrevious.timestamp < NOTIFICATION_RETURN_TIMEOUT_MS) {
                return true
            }
        }
        return false
    }
    
    private fun detectRecentsBrowsingPattern(
        transitions: List<AppTransition>,
        currentPackage: String
    ): Boolean {
        // Pattern: Multiple launcher/systemui transitions in short time
        if (transitions.size >= RECENTS_BROWSING_WINDOW_SIZE) {
            val systemUICount = transitions.takeLast(RECENTS_BROWSING_WINDOW_SIZE).count { 
                it.toPackage.contains("systemui") && 
                (it.className.lowercase().contains("recent") || 
                 it.className.lowercase().contains("task"))
            }
            
            // If we see multiple recent/task events, user is browsing recents
            if (systemUICount >= RECENTS_BROWSING_MIN_EVENTS) {
                return true
            }
        }
        return false
    }
    
    private fun detectQuickSettingsPattern(
        transitions: List<AppTransition>,
        currentPackage: String
    ): Boolean {
        // Pattern: App -> SystemUI (quick settings) -> Same App
        if (transitions.isNotEmpty()) {
            val last = transitions.last()
            
            if (last.toPackage.contains("systemui") &&
                (last.className.lowercase().contains("quicksetting") ||
                 last.className.lowercase().contains("brightness") ||
                 last.className.lowercase().contains("volume"))) {
                // Check if we're returning to the same app
                val previousAppTransition = transitions.findLast { 
                    !isSystemPackage(it.toPackage) && !isLauncherPackage(it.toPackage)
                }
                return previousAppTransition?.toPackage == currentPackage
            }
        }
        return false
    }
    
    /**
     * Determines whether to trigger an overlay for the given package.
     * Uses confidence scoring to make more reliable decisions.
     *
     * @return Pair of (shouldTrigger, confidence) for logging and debugging
     */
    private fun shouldTriggerOverlayWithConfidence(
        packageName: String,
        currentTime: Long
    ): Pair<Boolean, DetectionConfidence> {
        // Don't trigger for launchers
        if (isLauncherPackage(packageName)) {
            Log.d(TAG, "Not triggering for launcher: $packageName")
            return false to DetectionConfidence()
        }

        // Don't trigger if it's the same package
        if (packageName == lastPackageName) {
            return false to DetectionConfidence()
        }

        // Analyze the transition pattern
        val pattern = analyzeTransitionPattern(packageName, currentTime)
        Log.d(TAG, "Transition pattern for $packageName: $pattern")

        // Calculate pattern confidence
        val patternConfidence = getPatternConfidence(pattern)
        val confidence = DetectionConfidence.accessibilityOnly(patternConfidence)

        val shouldTrigger = when (pattern) {
            TransitionPattern.FIRST_APP_LAUNCH -> {
                Log.d(TAG, "First app launch detected (confidence: ${confidence.overall})")
                true
            }

            TransitionPattern.LAUNCHER_TO_APP -> {
                Log.d(TAG, "Direct launch from launcher detected (confidence: ${confidence.overall})")
                true
            }

            TransitionPattern.APP_SWITCH_VIA_LAUNCHER -> {
                Log.d(TAG, "App switch via launcher detected (confidence: ${confidence.overall})")
                true
            }

            TransitionPattern.DIRECT_APP_SWITCH -> {
                Log.d(TAG, "Direct app switch detected (confidence: ${confidence.overall})")
                true
            }

            TransitionPattern.RETURNING_TO_APP -> {
                Log.d(TAG, "Returning to same app, not triggering")
                false
            }

            TransitionPattern.NOTIFICATION_PULL -> {
                Log.d(TAG, "Returning from notification shade, not triggering")
                false
            }

            TransitionPattern.RECENTS_BROWSING -> {
                Log.d(TAG, "User browsing recents, not triggering")
                false
            }

            TransitionPattern.QUICK_SETTINGS_PULL -> {
                Log.d(TAG, "Returning from quick settings, not triggering")
                false
            }

            TransitionPattern.UNKNOWN -> {
                // For unknown patterns, use confidence-based decision
                Log.d(TAG, "Unknown pattern (confidence: ${confidence.overall})")
                when (confidence.level) {
                    ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM -> true
                    ConfidenceLevel.LOW -> currentTime - lastEventTimestamp > LAUNCHER_DEBOUNCE_MS
                    ConfidenceLevel.VERY_LOW -> false
                }
            }
        }

        return shouldTrigger to confidence
    }

    /**
     * Returns a confidence score (0.0-1.0) for a given transition pattern.
     */
    private fun getPatternConfidence(pattern: TransitionPattern): Float {
        return when (pattern) {
            TransitionPattern.FIRST_APP_LAUNCH -> 0.95f
            TransitionPattern.LAUNCHER_TO_APP -> 0.95f
            TransitionPattern.APP_SWITCH_VIA_LAUNCHER -> 0.90f
            TransitionPattern.DIRECT_APP_SWITCH -> 0.85f
            TransitionPattern.RETURNING_TO_APP -> 0.20f
            TransitionPattern.NOTIFICATION_PULL -> 0.15f
            TransitionPattern.RECENTS_BROWSING -> 0.10f
            TransitionPattern.QUICK_SETTINGS_PULL -> 0.15f
            TransitionPattern.UNKNOWN -> 0.50f
        }
    }
    
    /**
     * Checks if the system UI package/class represents a temporary overlay
     * that the user can interact with while still "in" a blocked app.
     * The overlay should remain visible for these cases.
     *
     * We're permissive here - if it's systemui and NOT the recents/task switcher,
     * we assume it's overlay-compatible (notification shade, quick settings, etc.)
     */
    private fun isOverlayCompatibleSystemUI(packageName: String, className: String): Boolean {
        val lowerClass = className.lowercase()
        val lowerPackage = packageName.lowercase()

        // Check if this is the recents/task switcher - NOT overlay compatible
        // because user is actively choosing a different app
        if (lowerClass.contains("recent") || lowerClass.contains("task")) {
            return false
        }

        // SystemUI package (notification shade, quick settings, volume, etc.)
        // These are temporary overlays - user is still "in" the blocked app
        if (lowerPackage.contains("systemui")) {
            return true
        }

        // Samsung system UI components
        if (lowerPackage.contains("samsung") &&
            (lowerClass.contains("notification") || lowerClass.contains("panel"))) {
            return true
        }

        // MIUI system UI components
        if (lowerPackage.contains("miui") &&
            (lowerClass.contains("notification") || lowerClass.contains("panel"))) {
            return true
        }

        // OnePlus/Oppo system UI
        if ((lowerPackage.contains("oneplus") || lowerPackage.contains("oppo")) &&
            lowerClass.contains("notification")) {
            return true
        }

        return false
    }

    private fun hideOverlayForBackgroundedApp() {
        try {
            val intent = Intent(this, OverlayControllerService::class.java).apply {
                putExtra(INTENT_EXTRA_HIDE_OVERLAY, true)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
            isMindedOverlayActive = false
            Log.d(TAG, "Sent hide overlay signal for backgrounded app")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to hide overlay for backgrounded app", e)
        }
    }
}

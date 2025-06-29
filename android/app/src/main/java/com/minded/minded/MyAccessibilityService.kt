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


class MyAccessibilityService : AccessibilityService() {
    private var lastPackageName: String? = null
    private var lastEventTimestamp: Long = 0
    private val recentPackageHistory = mutableListOf<Pair<String, Long>>()
    private val PACKAGE_HISTORY_SIZE = 5
    private val LAUNCHER_DEBOUNCE_MS = getManufacturerDebounceTime()
    
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
    private val transitionHistory = mutableListOf<AppTransition>()
    private var lastUserApp: String? = null
    
    // Device manufacturer info
    private val deviceManufacturer = Build.MANUFACTURER.lowercase()
    private val deviceModel = Build.MODEL.lowercase()

    companion object {
        const val INTENT_EXTRA_CURRENT_PACKAGE_NAME = "INTENT_EXTRA_CURRENT_PACKAGE_NAME"
        private const val TAG = "MindedAccessibility"
        private const val LAUNCHER_CACHE_DURATION_MS = 60_000L // 1 minute
        private const val LAUNCHER_DEBOUNCE_DEFAULT_MS = 500L
        private const val SYSTEM_APP_CACHE_DURATION_MS = 300_000L // 5 minutes
        private const val TRANSITION_HISTORY_DURATION_MS = 10_000L // 10 seconds
        private const val TRANSITION_HISTORY_MAX_SIZE = 20
        
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
        Log.d(TAG, "Device: $deviceManufacturer - $deviceModel")
        Log.d(TAG, "Debounce time: ${LAUNCHER_DEBOUNCE_MS}ms")
        
        // Clear any stale state on service creation
        lastPackageName = null
        lastEventTimestamp = 0
        recentPackageHistory.clear()
        transitionHistory.clear()
        lastUserApp = null
        
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
        val packageName = event.packageName?.toString() ?: return
        val currentTime = System.currentTimeMillis()
        
        // Extract event context for better validation
        val className = event.className?.toString() ?: ""
        val eventText = event.text.joinToString(" ")
        val contentDesc = event.contentDescription?.toString() ?: ""
        
        Log.d(TAG, "onAccessibilityEvent: package=$packageName, class=$className, lastPackage=$lastPackageName")
        
        // Skip if this is a system package
        if (isSystemPackage(packageName)) {
            Log.d(TAG, "Skipping system package: $packageName")
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
        
        // Check if this is a genuine app switch
        if (shouldTriggerOverlay(packageName, currentTime)) {
            Log.d(TAG, "Triggering overlay for package: $packageName")
            
            try {
                val intent = Intent(this, OverlayControllerService::class.java).apply {
                    putExtra(INTENT_EXTRA_CURRENT_PACKAGE_NAME, packageName)
                }
                startService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start OverlayControllerService for package: $packageName", e)
                // Try to ensure service is running and retry
                ensureOverlayServiceRunning()
                Handler(Looper.getMainLooper()).postDelayed({
                    try {
                        val retryIntent = Intent(this, OverlayControllerService::class.java).apply {
                            putExtra(INTENT_EXTRA_CURRENT_PACKAGE_NAME, packageName)
                        }
                        startService(retryIntent)
                    } catch (retryException: Exception) {
                        Log.e(TAG, "Retry failed for package: $packageName", retryException)
                    }
                }, 500)
            }
        }
        
        lastPackageName = packageName
        lastEventTimestamp = currentTime
    }
    
    private fun updatePackageHistory(packageName: String, timestamp: Long) {
        recentPackageHistory.add(packageName to timestamp)
        if (recentPackageHistory.size > PACKAGE_HISTORY_SIZE) {
            recentPackageHistory.removeAt(0)
        }
    }
    
    private fun trackTransition(toPackage: String, timestamp: Long, className: String = "") {
        // Add new transition
        val transition = AppTransition(
            fromPackage = lastPackageName,
            toPackage = toPackage,
            timestamp = timestamp,
            className = className
        )
        transitionHistory.add(transition)
        
        // Clean up old transitions
        val cutoffTime = timestamp - TRANSITION_HISTORY_DURATION_MS
        transitionHistory.removeAll { it.timestamp < cutoffTime }
        
        // Limit size
        while (transitionHistory.size > TRANSITION_HISTORY_MAX_SIZE) {
            transitionHistory.removeAt(0)
        }
        
        // Update last user app if this is not a system package
        if (!isSystemPackage(toPackage) && !isLauncherPackage(toPackage)) {
            lastUserApp = toPackage
        }
        
        Log.d(TAG, "Tracked transition: ${transition.fromPackage} -> ${transition.toPackage}")
    }
    
    private fun analyzeTransitionPattern(currentPackage: String, currentTime: Long): TransitionPattern {
        if (transitionHistory.isEmpty()) {
            return TransitionPattern.FIRST_APP_LAUNCH
        }
        
        val recentTransitions = transitionHistory.takeLast(5)
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
            currentTime - lastTransition.timestamp < 2000) {
            return TransitionPattern.LAUNCHER_TO_APP
        }
        
        // Check for app -> launcher -> app pattern (task switching)
        if (recentTransitions.size >= 2) {
            val secondLast = recentTransitions[recentTransitions.size - 2]
            if (!isSystemPackage(secondLast.fromPackage ?: "") &&
                isLauncherPackage(lastTransition?.toPackage ?: "") &&
                !isSystemPackage(currentPackage) &&
                currentTime - secondLast.timestamp < 3000) {
                return TransitionPattern.APP_SWITCH_VIA_LAUNCHER
            }
        }
        
        // Check for direct app-to-app switch
        if (lastTransition != null &&
            !isSystemPackage(lastTransition.fromPackage ?: "") &&
            !isSystemPackage(currentPackage) &&
            lastTransition.fromPackage != currentPackage &&
            currentTime - lastTransition.timestamp < 1000) {
            return TransitionPattern.DIRECT_APP_SWITCH
        }
        
        // Check if returning to same app after brief launcher/recents visit
        val sameAppTransitions = recentTransitions.filter { it.toPackage == currentPackage }
        if (sameAppTransitions.isNotEmpty() && 
            currentTime - sameAppTransitions.last().timestamp < 5000) {
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
                currentTime - beforePrevious.timestamp < 2000) {
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
        if (transitions.size >= 3) {
            val systemUICount = transitions.takeLast(3).count { 
                it.toPackage.contains("systemui") && 
                (it.className.lowercase().contains("recent") || 
                 it.className.lowercase().contains("task"))
            }
            
            // If we see multiple recent/task events, user is browsing recents
            if (systemUICount >= 2) {
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
    
    private fun shouldTriggerOverlay(packageName: String, currentTime: Long): Boolean {
        // Don't trigger for launchers
        if (isLauncherPackage(packageName)) {
            Log.d(TAG, "Not triggering for launcher: $packageName")
            return false
        }
        
        // Don't trigger if it's the same package
        if (packageName == lastPackageName) {
            return false
        }
        
        // Analyze the transition pattern
        val pattern = analyzeTransitionPattern(packageName, currentTime)
        Log.d(TAG, "Transition pattern for $packageName: $pattern")
        
        return when (pattern) {
            TransitionPattern.FIRST_APP_LAUNCH -> {
                // Always show overlay for first app launch
                Log.d(TAG, "First app launch detected")
                true
            }
            
            TransitionPattern.LAUNCHER_TO_APP -> {
                // Show overlay for direct launches from launcher
                Log.d(TAG, "Direct launch from launcher detected")
                true
            }
            
            TransitionPattern.APP_SWITCH_VIA_LAUNCHER -> {
                // Show overlay when switching between apps via launcher/recents
                Log.d(TAG, "App switch via launcher detected")
                true
            }
            
            TransitionPattern.DIRECT_APP_SWITCH -> {
                // Show overlay for direct app-to-app switches (e.g., via notifications)
                Log.d(TAG, "Direct app switch detected")
                true
            }
            
            TransitionPattern.RETURNING_TO_APP -> {
                // Don't show overlay when returning to same app
                Log.d(TAG, "Returning to same app, not triggering")
                false
            }
            
            TransitionPattern.NOTIFICATION_PULL -> {
                // Don't show overlay when returning from notification shade
                Log.d(TAG, "Returning from notification shade, not triggering")
                false
            }
            
            TransitionPattern.RECENTS_BROWSING -> {
                // Don't show overlay while browsing recents
                Log.d(TAG, "User browsing recents, not triggering")
                false
            }
            
            TransitionPattern.QUICK_SETTINGS_PULL -> {
                // Don't show overlay when returning from quick settings
                Log.d(TAG, "Returning from quick settings, not triggering")
                false
            }
            
            TransitionPattern.UNKNOWN -> {
                // For unknown patterns, use conservative approach
                Log.d(TAG, "Unknown pattern, using time-based logic")
                currentTime - lastEventTimestamp > LAUNCHER_DEBOUNCE_MS
            }
        }
    }
}

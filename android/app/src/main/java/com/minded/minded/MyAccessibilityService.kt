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


class MyAccessibilityService : AccessibilityService() {
    private var lastPackageName: String? = null
    private var lastEventTimestamp: Long = 0
    private val recentPackageHistory = mutableListOf<Pair<String, Long>>()
    private val PACKAGE_HISTORY_SIZE = 5
    private val LAUNCHER_DEBOUNCE_MS = 500L
    
    // Dynamic launcher detection
    private var cachedLaunchers: Set<String>? = null
    private var lastLauncherCacheTime = 0L

    companion object {
        const val INTENT_EXTRA_CURRENT_PACKAGE_NAME = "INTENT_EXTRA_CURRENT_PACKAGE_NAME"
        private const val TAG = "MindedAccessibility"
        private const val LAUNCHER_CACHE_DURATION_MS = 60_000L // 1 minute
        private const val LAUNCHER_DEBOUNCE_DEFAULT_MS = 500L
        
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
        
        // Clear any stale state on service creation
        lastPackageName = null
        lastEventTimestamp = 0
        recentPackageHistory.clear()
        
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
        return when {
            // Own package
            packageName == "com.minded.minded" -> true
            
            // System UI and launchers
            packageName.startsWith("com.android.systemui") -> true
            packageName.startsWith("com.android.launcher") -> true
            packageName.contains(".launcher") -> true
            packageName.contains(".home") -> true
            
            // Input methods
            packageName.contains("inputmethod") -> true
            packageName.contains("keyboard") -> true
            
            // System dialogs and settings
            packageName.startsWith("com.android.settings") -> true
            packageName.startsWith("com.android.packageinstaller") -> true
            packageName.startsWith("com.android.permissioncontroller") -> true
            
            // System services
            packageName.startsWith("com.android.system") -> true
            packageName == "android" -> true
            
            // Lock screens and security
            packageName.contains("keyguard") -> true
            packageName.contains("lockscreen") -> true
            
            // Accessibility services
            packageName.contains("accessibility") -> true
            packageName.contains("talkback") -> true
            
            else -> false
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


    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        val packageName = event.packageName?.toString() ?: return
        val currentTime = System.currentTimeMillis()
        
        Log.d(TAG, "onAccessibilityEvent: package=$packageName, lastPackage=$lastPackageName")
        
        // Skip if this is a system package
        if (isSystemPackage(packageName)) {
            Log.d(TAG, "Skipping system package: $packageName")
            return
        }
        
        // Track package history for better launcher detection
        updatePackageHistory(packageName, currentTime)
        
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
    
    private fun shouldTriggerOverlay(packageName: String, currentTime: Long): Boolean {
        // Don't trigger if it's the same package
        if (packageName == lastPackageName) {
            return false
        }
        
        // Handle launcher debouncing more intelligently
        if (isLauncherPackage(packageName)) {
            // Check if we're bouncing between launcher and app
            val timeSinceLastEvent = currentTime - lastEventTimestamp
            if (timeSinceLastEvent < LAUNCHER_DEBOUNCE_MS) {
                Log.d(TAG, "Debouncing launcher event: $packageName")
                return false
            }
        }
        
        // Check if the previous package was a launcher and we're quickly switching
        val lastPkg = lastPackageName
        if (lastPkg != null && isLauncherPackage(lastPkg)) {
            val timeSinceLastEvent = currentTime - lastEventTimestamp
            if (timeSinceLastEvent < LAUNCHER_DEBOUNCE_MS) {
                // But allow if we see the same app multiple times in history
                val recentAppCount = recentPackageHistory.count { it.first == packageName }
                if (recentAppCount < 2) {
                    Log.d(TAG, "Skipping quick launcher->app switch")
                    return false
                }
            }
        }
        
        return true
    }
}

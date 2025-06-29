# Android App Detection Research & Recommendations

## Current Implementation Analysis

The minded app currently uses `AccessibilityService` to detect foreground app changes. While this is a powerful approach, the implementation faces several challenges that affect reliability.

### Key Issues in Current Implementation

1. **Launcher/Home Screen "Bouncing"**
   - When users press home: `App A` → `Launcher` → `System UI`
   - When opening new app: `Launcher` → `App B`
   - Current solution: 500ms debounce in `MyAccessibilityService.kt:24-27`
   - Problem: Timing varies across devices and Android versions

2. **System Component Interference**
   - `isSystemPackage()` at `MyAccessibilityService.kt:108-142` filters known system packages
   - Hardcoded list is incomplete and device-specific
   - Uncovered system components can trigger false positives

3. **Event Timing and Redundancy**
   - Multiple `TYPE_WINDOW_STATE_CHANGED` events for single app switch
   - Double debouncing: 500ms (accessibility) + 1500ms (overlay service)
   - Complex logic in `shouldTriggerOverlay()` at `MyAccessibilityService.kt:204-235`

4. **Broadcast Receiver Registration Issue**
   - Android 14+ requires export flag for broadcast receivers
   - Current implementation at `MyAccessibilityService.kt:62-63` missing flag

## Android App Detection Methods Comparison

### 1. AccessibilityService (Current Method)
**Pros:**
- Real-time detection
- Event-driven (no polling needed)
- Rich context about UI changes

**Cons:**
- Requires sensitive permission
- Very "noisy" event stream
- Complex filtering needed

### 2. UsageStatsManager (Alternative)
**Pros:**
- Designed specifically for app usage tracking
- More reliable for identifying foreground app
- Less noise from system components

**Cons:**
- Requires `PACKAGE_USAGE_STATS` permission
- Not real-time (requires polling)
- Slight detection delay

### 3. ActivityManager.getRunningAppProcesses()
**Pros:**
- Simple implementation
- No special permissions

**Cons:**
- Unreliable on modern Android
- Privacy restrictions limit accuracy
- Not suitable for production use

## Recommended Improvements

### 1. Fix Broadcast Receiver Registration

```kotlin
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
```

### 2. Enhanced App Detection Algorithm

```kotlin
class EnhancedAppDetector {
    private val LAUNCHER_PACKAGES = setOf(
        "com.android.launcher",
        "com.android.launcher2",
        "com.android.launcher3",
        "com.google.android.apps.nexuslauncher",
        "com.google.android.launcher",
        "com.miui.home",
        "com.sec.android.app.launcher"
    )
    
    private val SYSTEM_UI_PACKAGES = setOf(
        "com.android.systemui",
        "android",
        "com.android.settings"
    )
    
    private data class AppTransition(
        val fromPackage: String?,
        val toPackage: String,
        val timestamp: Long,
        val isDirectLaunch: Boolean
    )
    
    private val recentTransitions = mutableListOf<AppTransition>()
    private var lastUserApp: String? = null
    
    fun processWindowChange(packageName: String): Boolean {
        val now = System.currentTimeMillis()
        
        // Ignore if it's a system UI component
        if (isSystemUIComponent(packageName)) {
            return false
        }
        
        // Track if this is a direct launch from launcher
        val isDirectLaunch = recentTransitions.lastOrNull()?.let {
            isLauncherPackage(it.toPackage) && 
            (now - it.timestamp) < 1000
        } ?: false
        
        // Add transition
        recentTransitions.add(AppTransition(
            fromPackage = recentTransitions.lastOrNull()?.toPackage,
            toPackage = packageName,
            timestamp = now,
            isDirectLaunch = isDirectLaunch
        ))
        
        // Keep only recent transitions (last 10 seconds)
        recentTransitions.removeAll { now - it.timestamp > 10000 }
        
        // Determine if we should show overlay
        return shouldShowOverlay(packageName, isDirectLaunch)
    }
    
    private fun shouldShowOverlay(packageName: String, isDirectLaunch: Boolean): Boolean {
        // Don't show for launchers
        if (isLauncherPackage(packageName)) return false
        
        // Show for direct launches from launcher
        if (isDirectLaunch) return true
        
        // Show if switching from a different user app
        if (lastUserApp != null && lastUserApp != packageName) {
            lastUserApp = packageName
            return true
        }
        
        // First app launch
        if (lastUserApp == null && !isSystemUIComponent(packageName)) {
            lastUserApp = packageName
            return true
        }
        
        return false
    }
}
```

### 3. Hybrid Approach: AccessibilityService + UsageStatsManager

```kotlin
class HybridAppDetector(private val context: Context) {
    private val usageStatsManager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    
    fun verifyForegroundApp(accessibilityPackageName: String): Boolean {
        // Use UsageStatsManager to verify the accessibility event
        val endTime = System.currentTimeMillis()
        val startTime = endTime - 5000 // Check last 5 seconds
        
        val usageEvents = usageStatsManager.queryEvents(startTime, endTime)
        var lastForegroundPackage: String? = null
        
        while (usageEvents.hasNextEvent()) {
            val event = UsageEvents.Event()
            usageEvents.getNextEvent(event)
            
            if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
                lastForegroundPackage = event.packageName
            }
        }
        
        // Verify accessibility event matches usage stats
        return lastForegroundPackage == accessibilityPackageName
    }
}
```

### 4. Improved Overlay Display Logic

```kotlin
class SmartOverlayController {
    private data class OverlayState(
        val packageName: String,
        val lastShown: Long,
        val interactionCompleted: Boolean,
        val sessionStart: Long
    )
    
    private val appStates = mutableMapOf<String, OverlayState>()
    private val MIN_INTERVAL_BETWEEN_SHOWS = 30_000L // 30 seconds
    private val SESSION_TIMEOUT = 5 * 60_000L // 5 minutes
    
    fun shouldShowOverlay(packageName: String): Boolean {
        val now = System.currentTimeMillis()
        val state = appStates[packageName]
        
        return when {
            // First time seeing this app
            state == null -> {
                appStates[packageName] = OverlayState(
                    packageName = packageName,
                    lastShown = now,
                    interactionCompleted = false,
                    sessionStart = now
                )
                true
            }
            
            // New session (been away from app for > 5 minutes)
            now - state.lastShown > SESSION_TIMEOUT -> {
                appStates[packageName] = state.copy(
                    lastShown = now,
                    interactionCompleted = false,
                    sessionStart = now
                )
                true
            }
            
            // Still in grace period after interaction
            state.interactionCompleted && 
            now - state.lastShown < MIN_INTERVAL_BETWEEN_SHOWS -> {
                false
            }
            
            // Show if enough time has passed
            else -> {
                val shouldShow = now - state.lastShown >= MIN_INTERVAL_BETWEEN_SHOWS
                if (shouldShow) {
                    appStates[packageName] = state.copy(lastShown = now)
                }
                shouldShow
            }
        }
    }
    
    fun markInteractionCompleted(packageName: String) {
        appStates[packageName]?.let {
            appStates[packageName] = it.copy(
                interactionCompleted = true,
                lastShown = System.currentTimeMillis()
            )
        }
    }
}
```

### 5. Dynamic Launcher Detection

```kotlin
class LauncherDetector(private val context: Context) {
    private var cachedLaunchers: Set<String>? = null
    private var lastCacheTime = 0L
    private val CACHE_DURATION = 60_000L // 1 minute
    
    fun isLauncherPackage(packageName: String): Boolean {
        val now = System.currentTimeMillis()
        
        // Refresh cache if needed
        if (cachedLaunchers == null || now - lastCacheTime > CACHE_DURATION) {
            cachedLaunchers = detectInstalledLaunchers()
            lastCacheTime = now
        }
        
        return cachedLaunchers?.contains(packageName) ?: false
    }
    
    private fun detectInstalledLaunchers(): Set<String> {
        val launchers = mutableSetOf<String>()
        
        // Get all apps that can handle home intent
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
        }
        
        val resolveInfos = context.packageManager.queryIntentActivities(
            intent, 
            PackageManager.MATCH_DEFAULT_ONLY
        )
        
        resolveInfos.forEach { resolveInfo ->
            launchers.add(resolveInfo.activityInfo.packageName)
        }
        
        // Add known launchers as fallback
        launchers.addAll(KNOWN_LAUNCHER_PACKAGES)
        
        return launchers
    }
}
```

## Implementation Roadmap

1. **Phase 1: Quick Fixes**
   - Fix broadcast receiver registration issue
   - Improve debouncing logic
   - Add more comprehensive launcher detection

2. **Phase 2: Enhanced Detection**
   - Implement transition tracking
   - Add session-based overlay logic
   - Improve system component filtering

3. **Phase 3: Hybrid Approach**
   - Add UsageStatsManager verification
   - Implement confidence scoring
   - Add telemetry for detection accuracy

4. **Phase 4: Advanced Features**
   - Machine learning for pattern detection
   - User-specific behavior adaptation
   - Cross-app navigation patterns

## Testing Recommendations

1. **Test Scenarios:**
   - Rapid app switching
   - Home button → Recent apps → Select app
   - Notification launches
   - Widget launches
   - Split-screen mode
   - Picture-in-picture transitions

2. **Device Coverage:**
   - Stock Android (Pixel devices)
   - Samsung One UI
   - Xiaomi MIUI
   - OnePlus OxygenOS
   - Android versions 10-14

3. **Performance Metrics:**
   - Detection accuracy rate
   - False positive rate
   - Battery impact
   - Memory usage

## Conclusion

The current implementation provides a solid foundation but needs refinement for reliable app detection. The recommended improvements focus on:

1. Better event filtering and pattern recognition
2. Session-aware overlay display logic
3. Dynamic launcher detection
4. Hybrid detection methods for verification

These changes will significantly improve the user experience by ensuring overlays appear consistently when switching to blocked apps while avoiding annoying false triggers.
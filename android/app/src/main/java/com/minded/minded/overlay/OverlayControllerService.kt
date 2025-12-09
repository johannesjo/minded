package com.minded.minded.overlay

import SharedPreferenceService
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.minded.minded.R
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import com.minded.minded.MainActivity
import com.minded.minded.MyAccessibilityService
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.util.parseSyncData
import com.minded.minded.util.ActiveTimer
import java.time.Instant


class OverlayControllerService : Service(), LifecycleOwner, SavedStateRegistryOwner {
    private val logTag = javaClass.simpleName

    private val GRACE_PERIOD_IN_S = 30
    private val RESET_APP_USAGE_DURATION_THRESHOLD_IN_S = 30 * 60
    private val MAX_OVERLAY_RETRY_ATTEMPTS = 3
    private val OVERLAY_RETRY_DELAY_MS = 500L
    private val NOTIFICATION_ID = 1001
    private val NOTIFICATION_CHANNEL_ID = "minded_protection_service"

    private var wasNoOverlaysBefore = false
    private var lastGoToAppTimestamp: Long = 0
    private val APP_SWITCH_DEBOUNCE_MS: Long = 1500L // Reduced from 2200ms for better UX
    private val overlayRetryHandler = Handler(Looper.getMainLooper())
    private val pendingOverlayRetries = mutableMapOf<String, Int>()

    private val _lifecycleRegistry = LifecycleRegistry(this)
    private val _savedStateRegistryController: SavedStateRegistryController =
        SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry =
        _savedStateRegistryController.savedStateRegistry
    override val lifecycle: Lifecycle = _lifecycleRegistry

    private lateinit var sharedOverlayViewModel: SharedOverlayViewModel


    private lateinit var interactionOverlayWindow: InteractionWindow
    private lateinit var littleSunOverlayWindow: LittleSunWindow
    private lateinit var smallMsgOverlayWindow: SmallMsgWindow
    private lateinit var successSunOverlayWindow: SuccessSunWindow
    private lateinit var sharedPreferenceService: SharedPreferenceService


    override fun onCreate() {
        super.onCreate()
        
        // Create notification channel and start foreground service
        createNotificationChannel()
        startForegroundService()
        
        val windowManager: WindowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        sharedOverlayViewModel = SharedOverlayViewModel();
        // NOTE: initialization should be enough to write data
        sharedPreferenceService = SharedPreferenceService(this)
        sharedPreferenceService.writeDefaultDataIfNecessary();
        val syncData = sharedPreferenceService.getSyncData()
        sharedOverlayViewModel.updateActiveTimer(syncData.activeTimer)

        interactionOverlayWindow =
            InteractionWindow(this, sharedOverlayViewModel, windowManager)
        littleSunOverlayWindow = LittleSunWindow(this, sharedOverlayViewModel, windowManager)
        smallMsgOverlayWindow = SmallMsgWindow(this, sharedOverlayViewModel, windowManager)
        successSunOverlayWindow = SuccessSunWindow(this, sharedOverlayViewModel, windowManager)

        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                getString(R.string.notification_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_description)
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun startForegroundService() {
        val notification = createNotification()
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID, 
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MANIFEST
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(android.R.drawable.ic_dialog_info) // You can replace with your own icon
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }


    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Ensure we are in the foreground every time the service is started/commanded
        startForegroundService()

        // Handle null intent (can happen during service restart)
        if (intent == null) {
            Log.v(logTag, "onStartCommand() with null intent - service restart")
            return START_STICKY
        }
        
        // Check if this is a hide overlay request from accessibility service
        if (intent.getBooleanExtra(MyAccessibilityService.INTENT_EXTRA_HIDE_OVERLAY, false)) {
            Log.v(logTag, "onStartCommand() - hiding all overlays due to app backgrounding")
            hideAllBut()
            return START_STICKY
        }
        
        val currentPackage =
            intent.getStringExtra(MyAccessibilityService.INTENT_EXTRA_CURRENT_PACKAGE_NAME)
        Log.d(logTag, "onStartCommand() received intent for package: $currentPackage")
        if (currentPackage != null) {
            checkToShowOverlay(currentPackage)
        } else {
            val overlayNameString = intent.getStringExtra(INTENT_EXTRA_OVERLAY_NAME)
            if (overlayNameString.isNullOrEmpty()) {
                // If no specific action is provided, just ensure service is running
                Log.v(logTag, "onStartCommand() - service initialization without specific action")
                return START_STICKY
            }
            val overlayName = OverlayName.valueOf(overlayNameString)

            if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
                val overlayModeString = intent.getStringExtra(INTENT_EXTRA_OVERLAY_MODE)
                val overlayMode =
                    if (overlayModeString != null) OverlayMode.valueOf(overlayModeString) else null
                val appName = intent.getStringExtra(INTENT_EXTRA_APP_NAME)
                showOverlay(overlayName, overlayMode, appName)
            }

            if (intent.hasExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY)) {
                hideOverlay(overlayName)
            }
        }


        // Return START_STICKY to ensure service restarts if killed
        return START_STICKY
    }


    private fun isAnyWindowShown(): Boolean {
        return interactionOverlayWindow.isWindowShown() || littleSunOverlayWindow.isWindowShown() || smallMsgOverlayWindow.isWindowShown() || successSunOverlayWindow.isWindowShown()
    }

    private fun isNoWindowShown(): Boolean {
        return !interactionOverlayWindow.isWindowShown() && !littleSunOverlayWindow.isWindowShown() && !smallMsgOverlayWindow.isWindowShown() && !successSunOverlayWindow.isWindowShown()
    }

    private fun showOverlay(
        overlayName: OverlayName,
        overlayMode: OverlayMode? = null,
        appName: String? = null
    ) {
        Log.v(logTag, "showOverlay() ${overlayName} ${overlayMode} ${appName}")
        wasNoOverlaysBefore = false

        if (appName != null) {
            sharedOverlayViewModel.updateSharedData(
                appName
            )
        }

        if (isAnyWindowShown()) {
            _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
        } else {
            Log.v(logTag, "showOverlay() - ON_START")
            _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        }

        try {
            when (overlayName) {
                OverlayName.INTERACTION_OVERLAY -> {
                    if (appName == null) {
                        throw RuntimeException("appName is null")
                    }
                    if (overlayMode == OverlayMode.INTERACTION_OVERLAY__FRESH) {
                        sharedOverlayViewModel.resetAll(appName)
                    } else {
                        sharedOverlayViewModel.resetAnswerTxt()
                        sharedOverlayViewModel.resetSunTxt()
                    }
                    // when whe show the question, we likely want to update the current app usage
                    sharedOverlayViewModel.updateLastAppUsage()
                    interactionOverlayWindow.showWindow()

                    // we hide others only after to avoid lifecycle complications
                    hideAllBut(OverlayName.INTERACTION_OVERLAY)
                }

                OverlayName.SUCCESS_SUN_OVERLAY -> {
                    if (overlayMode === OverlayMode.SUCCESS_SUN_OVERLAY__FINAL) {
                        sharedOverlayViewModel.updateSharedData(
                            successSunTxt = "That's a good decision!",
                        )
                    } else {
                        sharedOverlayViewModel.updateSharedData(
                            successSunTxt = "tap sun to close",
                        )
                    }
                    successSunOverlayWindow.showWindow()
                }

                OverlayName.LITTLE_SUN_OVERLAY -> {
                    littleSunOverlayWindow.showWindow()
                }

                OverlayName.SMALL_MSG_OVERLAY -> {
                    smallMsgOverlayWindow.showWindow()
                }
            }
            
            // Clear retry count on successful show
            val retryKey = "${overlayName}_${appName ?: ""}"
            pendingOverlayRetries.remove(retryKey)
            
        } catch (e: Exception) {
            Log.e(logTag, "Failed to show overlay ${overlayName}", e)
            scheduleOverlayRetry(overlayName, overlayMode, appName)
        }
    }
    
    private fun scheduleOverlayRetry(
        overlayName: OverlayName,
        overlayMode: OverlayMode?,
        appName: String?
    ) {
        val retryKey = "${overlayName}_${appName ?: ""}"
        val currentRetries = pendingOverlayRetries[retryKey] ?: 0
        
        if (currentRetries < MAX_OVERLAY_RETRY_ATTEMPTS) {
            pendingOverlayRetries[retryKey] = currentRetries + 1
            
            overlayRetryHandler.postDelayed({
                Log.d(logTag, "Retrying overlay display: $overlayName (attempt ${currentRetries + 1})")
                showOverlay(overlayName, overlayMode, appName)
            }, OVERLAY_RETRY_DELAY_MS * (currentRetries + 1))
        } else {
            Log.e(logTag, "Max retry attempts reached for overlay: $overlayName")
            pendingOverlayRetries.remove(retryKey)
        }
    }

    private fun hideOverlay(overlayName: OverlayName) {
        when (overlayName) {
            OverlayName.INTERACTION_OVERLAY -> interactionOverlayWindow.hideWindow()
            OverlayName.SUCCESS_SUN_OVERLAY -> successSunOverlayWindow.hideWindow()
            OverlayName.LITTLE_SUN_OVERLAY -> littleSunOverlayWindow.hideWindow()
            OverlayName.SMALL_MSG_OVERLAY -> smallMsgOverlayWindow.hideWindow()
        }
        if (isNoWindowShown() && !wasNoOverlaysBefore) {
            Log.v(logTag, "hideOverlay() - ON_STOP")
            Handler(Looper.getMainLooper()).post {
                _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
                _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
            }
            wasNoOverlaysBefore = true
        }
    }


    private fun isBlockedPackage(packageName: String): Boolean {
        val blockedApps = sharedPreferenceService.getBlockedApps()
        Log.d(logTag, "isBlockedPackage() - checking $packageName against blocked apps: $blockedApps")
        
        // If no apps are blocked in preferences, use hardcoded test apps
        if (blockedApps.isEmpty()) {
            Log.d(logTag, "No blocked apps configured, using test apps: Chrome and YouTube")
            return packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
        }
        
        return blockedApps.contains(packageName)
    }

    private fun checkToShowOverlay(currentPackageName: String) {
        val blockedApps = sharedPreferenceService.getBlockedApps()
        Log.d(logTag, "checkToShowOverlay() - Blocked apps list: $blockedApps")
        
        val entryForCurrentApp = sharedOverlayViewModel.sharedData.value.appMap[currentPackageName]
        val activeTimer = sharedOverlayViewModel.sharedData.value.activeTimer
        val now = Instant.now()
        val activeTimerEndTime = activeTimer?.let { Instant.ofEpochMilli(it.endTS) }
        val isInGracePeriod = entryForCurrentApp?.lastUsed?.let {
            it > now.minusSeconds(GRACE_PERIOD_IN_S.toLong())
        } ?: false
        val sessionEndTime = entryForCurrentApp?.sessionEndTime ?: activeTimerEndTime
        val isWithinSessionLimit = sessionEndTime?.let { it > now } ?: false
        if (isWithinSessionLimit && entryForCurrentApp?.sessionEndTime == null && activeTimerEndTime != null) {
            // Keep per-app map in sync so Little Sun countdown can restore after process restarts
            sharedOverlayViewModel.updateCurrentAppSessionEndTime(activeTimerEndTime)
        }
        
        val isRecentAppSwitch = lastGoToAppTimestamp > 0 && 
            System.currentTimeMillis() - lastGoToAppTimestamp < APP_SWITCH_DEBOUNCE_MS
        val isBlocked = isBlockedPackage(currentPackageName)

        Log.v(
            logTag,
            "checkToShowOverlay() gracePeriod=$isInGracePeriod sessionLimit=$isWithinSessionLimit blocked=$isBlocked " +
            "package=$currentPackageName recentSwitch=$isRecentAppSwitch"
        )

        // Skip if user just switched to the app (debounce)
        if (isRecentAppSwitch) {
            Log.d(logTag, "Skipping due to recent app switch")
            return
        }

        if (!isBlockedPackage(currentPackageName)) {
            hideAllBut()
            return;
        }

        // Already handled by isSystemPackage in AccessibilityService, but double-check launchers
        if (currentPackageName.contains("launcher") || currentPackageName.contains("home")) {
            hideAllBut()
            return
        }

        if (isBlockedPackage(currentPackageName)) {
            // NOTE needs to be at the end to only update lastUsage after this
            val currentAppData = sharedOverlayViewModel.sharedData.value.appMap[currentPackageName]
            if (currentAppData != null && currentAppData.lastUsed.isBefore(
                    Instant.now().minusSeconds(RESET_APP_USAGE_DURATION_THRESHOLD_IN_S.toLong())
                )
            ) {
                Log.v(logTag, "reset sessionDurationInS to 0")
                sharedOverlayViewModel.updateCurrentAppSessionDuration(0)
            }

            if (littleSunOverlayWindow.isWindowShown() || interactionOverlayWindow.isWindowShown() || smallMsgOverlayWindow.isWindowShown() || successSunOverlayWindow.isWindowShown()) {
                Log.v(
                    logTag,
                    "checkToShowOverlay() skip because one of the overlays is already shown"
                )
            } else if (isInGracePeriod || isWithinSessionLimit) {
                Log.v(logTag, "isInGracePeriod or isWithinSessionLimit")
                if (!littleSunOverlayWindow.isWindowShown()) {
                    showOverlay(OverlayName.LITTLE_SUN_OVERLAY, null, currentPackageName)
                    // Removed SMALL_MSG_OVERLAY - only show the little sun
                }
                // since we also want to show the question overlay after the lock screen, we DON'T do this check
//            } else if (lastForeGroundApp == currentPackageName) {
//                Log.v(logTag, "lastForeGroundApp == currentPackageName => true")
//                if (!littleSunOverlayWindow.isWindowShown()) {
//                    showOverlay(OverlayName.AFTER_SUN_OVERLAY, null, currentPackageName)
//                }
            } else {
                Log.v(logTag, "SHOW FRESH INTERACTION OVERLAY for: $currentPackageName")
                showOverlay(
                    OverlayName.INTERACTION_OVERLAY,
                    OverlayMode.INTERACTION_OVERLAY__FRESH,
                    currentPackageName
                )
            }
        }
    }


    private fun hideAllBut(exclude: OverlayName? = null) {
        if (exclude != OverlayName.INTERACTION_OVERLAY) hideOverlay(OverlayName.INTERACTION_OVERLAY);
        if (exclude != OverlayName.SUCCESS_SUN_OVERLAY) hideOverlay(OverlayName.SUCCESS_SUN_OVERLAY);
        if (exclude != OverlayName.SMALL_MSG_OVERLAY) hideOverlay(OverlayName.SMALL_MSG_OVERLAY);
        if (exclude != OverlayName.LITTLE_SUN_OVERLAY) hideOverlay(OverlayName.LITTLE_SUN_OVERLAY);
    }


    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }

    override fun onDestroy() {
        Log.d(logTag, "onDestroy() - Service is being destroyed")
        
        // Cancel any pending retry attempts
        overlayRetryHandler.removeCallbacksAndMessages(null)
        pendingOverlayRetries.clear()
        
        // Hide all overlays before destruction
        hideAllBut()
        
        super.onDestroy()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        
        // Schedule service restart to ensure continuous protection
        scheduleServiceRestart()
    }
    
    private fun scheduleServiceRestart() {
        val restartServiceIntent = Intent(this, OverlayControllerService::class.java)
        val restartServicePendingIntent = PendingIntent.getService(
            this, 
            1, 
            restartServiceIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val alarmService = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmService.set(
            AlarmManager.ELAPSED_REALTIME_WAKEUP,
            SystemClock.elapsedRealtime() + 5000, // Restart after 5 seconds
            restartServicePendingIntent
        )
        
        Log.d(logTag, "Service restart scheduled")
    }

    fun userDrivenClose(isSkipShowSuccessSunAfter: Boolean = false) {
        Log.v(
            "QuestionOverlaySVC",
            "userDrivenClose() isSkipShowSuccessSunAfter: $isSkipShowSuccessSunAfter"
        )
        sharedPreferenceService.countUserDrivenClose()
        // we do this to let the sun animation finish, sun is supposed to close itself after
        hideAllBut(OverlayName.SUCCESS_SUN_OVERLAY)

        goToApp()

        if (!isSkipShowSuccessSunAfter) {
            showOverlay(
                this,
                OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY,
                OverlayControllerService.Companion.OverlayMode.SUCCESS_SUN_OVERLAY__FINAL
            )
        }
    }

    fun setSessionLimit(seconds: Int) {
        Log.d(logTag, "setSessionLimit($seconds) called")
        val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
        Log.d(logTag, "setSessionLimit - currentApp: $currentApp")

        if (currentApp == null) {
            Log.e(logTag, "setSessionLimit - currentApp is null, cannot set session limit")
            return
        }

        val isRestOfDay = seconds < 0
        val now = System.currentTimeMillis()
        val endTS = if (isRestOfDay) {
            // End of day (Midnight of the next day)
            Instant.now().atZone(java.time.ZoneId.systemDefault())
                .toLocalDate().plusDays(1)
                .atStartOfDay(java.time.ZoneId.systemDefault())
                .toInstant().toEpochMilli()
        } else {
            now + seconds * 1000L
        }

        val activeTimer = ActiveTimer(endTS, seconds)
        sharedPreferenceService.updateSyncData {
            copy(activeTimer = activeTimer)
        }
        sharedOverlayViewModel.updateActiveTimer(activeTimer)

        Log.d(logTag, "setSessionLimit - endTS: $endTS, isRestOfDay: $isRestOfDay")
        sharedOverlayViewModel.updateCurrentAppSessionEndTime(Instant.ofEpochMilli(endTS))

        // Hide interaction window on main thread
        Handler(Looper.getMainLooper()).post {
            Log.d(logTag, "setSessionLimit - on main thread, hiding interaction window")
            interactionOverlayWindow.hideWindow()

            // Only show Little Sun for timed sessions, not for "Rest of Day"
            if (!isRestOfDay) {
                Log.d(logTag, "setSessionLimit - showing Little Sun overlay")
                showOverlay(OverlayName.LITTLE_SUN_OVERLAY, null, currentApp)
            } else {
                Log.d(logTag, "setSessionLimit - Rest of Day selected, not showing Little Sun")
            }
        }
    }

    fun clearSession() {
        sharedPreferenceService.updateSyncData {
            copy(activeTimer = null)
        }
        sharedOverlayViewModel.updateActiveTimer(null)
        // Also clear local session end time for current app to avoid confusion
        sharedOverlayViewModel.updateCurrentAppSessionEndTime(null)
    }

    fun goToHomeScreen() {
        Log.d(logTag, "goToHomeScreen() - attempting to go to home screen")
        
        try {
            // Method 1: Try to use the home intent
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            startActivity(homeIntent)
            Log.d(logTag, "goToHomeScreen() - home intent sent successfully")
        } catch (e: Exception) {
            Log.e(logTag, "goToHomeScreen() - failed to send home intent", e)
            
            // Method 2: Fallback - try to use accessibility service to go home
            try {
                // Send a broadcast to accessibility service to perform global home action
                val intent = Intent("com.minded.ACTION_GO_HOME")
                intent.setPackage(packageName)
                sendBroadcast(intent)
                Log.d(logTag, "goToHomeScreen() - sent ACTION_GO_HOME broadcast to accessibility service")
            } catch (fallbackError: Exception) {
                Log.e(logTag, "goToHomeScreen() - fallback also failed", fallbackError)
            }
        }
    }

    fun goToApp() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        lastGoToAppTimestamp = System.currentTimeMillis()
        startActivity(intent)
    }


    companion object {
        const val INTENT_EXTRA_OVERLAY_NAME = "INTENT_EXTRA_OVERLAY_NAME"
        const val INTENT_EXTRA_OVERLAY_MODE = "INTENT_EXTRA_OVERLAY_MODE"
        const val INTENT_EXTRA_APP_NAME = "INTENT_EXTRA_APP_NAME"
        const val INTENT_EXTRA_COMMAND_SHOW_OVERLAY = "INTENT_EXTRA_COMMAND_SHOW_OVERLAY"
        const val INTENT_EXTRA_COMMAND_HIDE_OVERLAY = "INTENT_EXTRA_COMMAND_HIDE_OVERLAY"

        public enum class OverlayName {
            INTERACTION_OVERLAY, LITTLE_SUN_OVERLAY, SMALL_MSG_OVERLAY, SUCCESS_SUN_OVERLAY
        }

        public enum class OverlayMode {
            INTERACTION_OVERLAY__FRESH, SUCCESS_SUN_OVERLAY__FINAL
        }

        internal fun showOverlay(
            context: Context,
            overlayName: OverlayName,
            overlayMode: OverlayMode? = null,
            manualAppName: String? = null
        ) {
            val intent = Intent(context, OverlayControllerService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_OVERLAY_NAME, overlayName.name)
            intent.putExtra(INTENT_EXTRA_OVERLAY_MODE, overlayMode?.name)
            intent.putExtra(INTENT_EXTRA_APP_NAME, manualAppName)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        internal fun hideOverlay(
            context: Context, overlayName: OverlayName
        ) {
            val intent = Intent(context, OverlayControllerService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_OVERLAY_NAME, overlayName.name)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}

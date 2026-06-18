package com.minded.minded.overlay

import com.minded.minded.data.SharedPreferenceService
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
import com.minded.minded.detection.OverlayDecision
import com.minded.minded.detection.OverlayDecisionEngine
import com.minded.minded.detection.OverlayState
import com.minded.minded.overlay.data.SharedOverlayViewModel
import com.minded.minded.sleepwinddown.SleepWindDownWindow
import com.minded.minded.util.getBudgetRemainingSeconds
import com.minded.minded.util.hasBudgetRemaining
import com.minded.minded.util.ActiveTimer
import com.minded.minded.util.SessionIntent
import com.minded.minded.util.SessionTarget
import com.minded.minded.util.SyncData
import com.minded.minded.util.ForegroundAppResult
import com.minded.minded.util.getForegroundAppReliable
import java.time.Instant


class OverlayControllerService : Service(), LifecycleOwner, SavedStateRegistryOwner {
    private val logTag = javaClass.simpleName

    private val RESET_APP_USAGE_DURATION_THRESHOLD_IN_S = 30 * 60
    private val MAX_OVERLAY_RETRY_ATTEMPTS = 3
    private val OVERLAY_RETRY_DELAY_MS = 500L
    private val NOTIFICATION_ID = 1001
    private val NOTIFICATION_CHANNEL_ID = "minded_protection_service"

    private var wasNoOverlaysBefore = false
    private var lastGoToAppTimestamp: Long = 0
    private var lastHideAllTimestamp: Long = 0
    private val APP_SWITCH_DEBOUNCE_MS: Long = 1500L // Reduced from 2200ms for better UX
    private val HIDE_TO_SHOW_DEBOUNCE_MS: Long = 500L
    private val FALLBACK_BLOCKED_APPS = setOf("com.android.chrome", "com.google.android.youtube")
    private val overlayRetryHandler = Handler(Looper.getMainLooper())
    private val pendingOverlayRetries = mutableMapOf<String, Int>()
    private val overlayDecisionEngine = OverlayDecisionEngine()

    // Screen state tracking for overlay restoration
    private var overlayStateBeforeScreenOff: OverlayName? = null
    private var appBeforeScreenOff: String? = null
    private val screenStateHandler = Handler(Looper.getMainLooper())
    private val SCREEN_ON_CHECK_DELAY_MS = 500L

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
    private lateinit var sleepWindDownOverlayWindow: SleepWindDownOverlayWindow
    private lateinit var sharedPreferenceService: SharedPreferenceService

    private val screenStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> {
                    Log.d(logTag, "Screen turned OFF - saving overlay state")
                    // Save which overlay was showing
                    overlayStateBeforeScreenOff = when {
                        sleepWindDownOverlayWindow.isWindowShown() -> OverlayName.SLEEP_WIND_DOWN_OVERLAY
                        littleSunOverlayWindow.isWindowShown() -> OverlayName.LITTLE_SUN_OVERLAY
                        interactionOverlayWindow.isWindowShown() -> OverlayName.INTERACTION_OVERLAY
                        else -> null
                    }
                    appBeforeScreenOff = sharedOverlayViewModel.sharedData.value.currentApp
                    Log.d(logTag, "Saved state: overlay=$overlayStateBeforeScreenOff, app=$appBeforeScreenOff")
                }
                Intent.ACTION_SCREEN_ON -> {
                    Log.d(logTag, "Screen turned ON - will wait for USER_PRESENT to restore overlay")
                    // Don't restore here - wait for USER_PRESENT which fires after unlock
                }
                Intent.ACTION_USER_PRESENT -> {
                    Log.d(logTag, "User unlocked device - restoring overlay if needed")
                    // Delay slightly to let the foreground app detection settle
                    screenStateHandler.postDelayed({
                        restoreOverlayAfterUnlock()
                    }, SCREEN_ON_CHECK_DELAY_MS)
                }
            }
        }
    }

    private fun restoreOverlayAfterUnlock() {
        val savedOverlay = overlayStateBeforeScreenOff
        val savedApp = appBeforeScreenOff

        if (savedOverlay == null || savedApp == null) {
            Log.d(logTag, "No overlay to restore (savedOverlay=$savedOverlay, savedApp=$savedApp)")
            return
        }

        // Check if user is still on a blocked app
        // Only trust fresh data (Success) - stale data might be from before screen off
        val foregroundResult = getForegroundAppReliable(this, lookbackMs = 5000, staleThresholdMs = 2000)
        val freshForegroundApp = when (foregroundResult) {
            is ForegroundAppResult.Success -> foregroundResult.packageName
            is ForegroundAppResult.Stale -> {
                Log.d(logTag, "restoreOverlayAfterUnlock: UsageStats data is stale (${foregroundResult.ageMs}ms), ignoring")
                null
            }
            else -> null
        }

        Log.d(logTag, "restoreOverlayAfterUnlock: freshForeground=$freshForegroundApp, savedApp=$savedApp, savedOverlay=$savedOverlay")

        // Decide whether the user is still on a blocked app. Prefer fresh
        // foreground data when available, otherwise trust the saved app.
        val isOnBlockedApp = when {
            freshForegroundApp != null -> isBlockedPackage(freshForegroundApp)
            else -> isBlockedPackage(savedApp)
        }

        if (isOnBlockedApp && savedOverlay == OverlayName.INTERACTION_OVERLAY) {
            // Unlocking straight into the intervention feels jarring. Background
            // the blocked app; intervention will re-trigger via the normal
            // accessibility flow if the user re-opens it. Hide the interaction
            // window directly (not hideAllBut) so we don't bump the
            // lastHideAllTimestamp debounce and accidentally swallow that
            // re-trigger.
            Log.d(logTag, "Backgrounding blocked app after unlock from intervention")
            interactionOverlayWindow.hideWindow()
            goToHomeScreen()
        } else if (isOnBlockedApp) {
            // For Little Sun (active timer) or wind-down, the user explicitly
            // opted into that state — keep restoring it via the normal flow,
            // which also handles timer/budget expiry while screen was off.
            val appToRestore = freshForegroundApp ?: savedApp
            Log.d(logTag, "Restoring overlay after unlock: savedOverlay=$savedOverlay app=$appToRestore")
            checkToShowOverlay(appToRestore)
        } else {
            Log.d(logTag, "User not on blocked app, clearing saved state")
        }

        // Clear saved state
        overlayStateBeforeScreenOff = null
        appBeforeScreenOff = null
    }

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
        sleepWindDownOverlayWindow =
            SleepWindDownOverlayWindow(this, sharedOverlayViewModel, windowManager)

        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)

        // Register screen state receiver to restore overlays after lock/unlock
        val screenFilter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenStateReceiver, screenFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenStateReceiver, screenFilter)
        }
        Log.d(logTag, "Screen state receiver registered")

        // Publish after windows are initialized (isInputOverlayVisible reads them)
        instance = this
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
    
    // TODO(#21): this foreground service exists only to stay resident for overlay
    // hosting; the always-on accessibility service could own that instead, dropping
    // the FGS and its notification entirely. See johannesjo/minded#21.
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
        return interactionOverlayWindow.isWindowShown() || littleSunOverlayWindow.isWindowShown() || smallMsgOverlayWindow.isWindowShown() || successSunOverlayWindow.isWindowShown() || sleepWindDownOverlayWindow.isWindowShown()
    }

    private fun isNoWindowShown(): Boolean {
        return !interactionOverlayWindow.isWindowShown() && !littleSunOverlayWindow.isWindowShown() && !smallMsgOverlayWindow.isWindowShown() && !successSunOverlayWindow.isWindowShown() && !sleepWindDownOverlayWindow.isWindowShown()
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

                OverlayName.SLEEP_WIND_DOWN_OVERLAY -> {
                    if (appName != null) {
                        sharedOverlayViewModel.resetAll(appName)
                    }
                    sharedOverlayViewModel.updateLastAppUsage()
                    sleepWindDownOverlayWindow.showWindow()
                    hideAllBut(OverlayName.SLEEP_WIND_DOWN_OVERLAY)
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

    private fun isInputOverlayShown(): Boolean {
        // Guard lateinit: instance is published before windows exist only if
        // onCreate ordering changes; be defensive
        if (!::interactionOverlayWindow.isInitialized) return false
        return interactionOverlayWindow.isWindowShown() ||
            sleepWindDownOverlayWindow.isWindowShown()
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
            OverlayName.SLEEP_WIND_DOWN_OVERLAY -> sleepWindDownOverlayWindow.hideWindow()
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


    internal fun getSharedPreferenceService(): SharedPreferenceService = sharedPreferenceService

    /**
     * True when the user is inside their configured bedtime window AND the
     * snooze deadline is still in the future. Distinct from [isWindDownActive],
     * which excludes the snooze period — during snooze we show the regular
     * little-sun countdown instead of the full wind-down overlay.
     */
    private fun isWindDownSnoozed(syncData: SyncData): Boolean {
        val nightId = SleepWindDownWindow.resolveNightId(syncData.cfg) ?: return false
        if (syncData.sleepWindDownDismissedNightId == nightId) return false
        return syncData.sleepWindDownSnoozeUntilTS > System.currentTimeMillis()
    }

    private fun isWindDownActive(syncData: SyncData): Boolean {
        val nightId = SleepWindDownWindow.resolveNightId(syncData.cfg) ?: return false
        if (syncData.sleepWindDownDismissedNightId == nightId) return false
        if (syncData.sleepWindDownSnoozeUntilTS > System.currentTimeMillis()) return false
        return true
    }

    internal fun getWindDownSnoozeTimerEndTime(): Instant? {
        val syncData = sharedPreferenceService.getSyncData()
        val nightId = SleepWindDownWindow.resolveNightId(syncData.cfg) ?: return null
        if (syncData.sleepWindDownDismissedNightId == nightId) return null
        val snoozeEndTS = syncData.sleepWindDownSnoozeUntilTS
        return if (snoozeEndTS > 0) Instant.ofEpochMilli(snoozeEndTS) else null
    }

    private fun showWindDownSnoozeTimer(currentPackageName: String, syncData: SyncData) {
        val snoozeEndTS = syncData.sleepWindDownSnoozeUntilTS
        val snoozeEndTime = Instant.ofEpochMilli(snoozeEndTS)

        sharedOverlayViewModel.updateSharedData(currentPackageName)
        sharedOverlayViewModel.updateCurrentAppSessionEndTime(snoozeEndTime)

        if (!littleSunOverlayWindow.isWindowShown()) {
            showOverlay(OverlayName.LITTLE_SUN_OVERLAY, null, currentPackageName)
        }
        hideAllBut(OverlayName.LITTLE_SUN_OVERLAY)
    }

    fun snoozeWindDown(seconds: Int) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            Handler(Looper.getMainLooper()).post {
                snoozeWindDown(seconds)
            }
            return
        }

        Log.d(logTag, "snoozeWindDown($seconds) called")
        val currentApp = sharedOverlayViewModel.sharedData.value.currentApp
        if (currentApp == null) {
            Log.e(logTag, "snoozeWindDown - currentApp is null, cannot start snooze timer")
            return
        }

        val now = System.currentTimeMillis()
        var syncData = sharedPreferenceService.getSyncData()
        val snoozeEndTS = if (syncData.sleepWindDownSnoozeUntilTS > now) {
            syncData.sleepWindDownSnoozeUntilTS
        } else {
            now + seconds * 1000L
        }

        if (syncData.sleepWindDownSnoozeUntilTS != snoozeEndTS) {
            sharedPreferenceService.updateSyncData {
                copy(sleepWindDownSnoozeUntilTS = snoozeEndTS)
            }
            syncData = syncData.copy(sleepWindDownSnoozeUntilTS = snoozeEndTS)
        }

        showWindDownSnoozeTimer(currentApp, syncData)
    }

    fun onLittleSunTimerExpired(currentApp: String, wasWindDownSnooze: Boolean) {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            Handler(Looper.getMainLooper()).post {
                onLittleSunTimerExpired(currentApp, wasWindDownSnooze)
            }
            return
        }

        Log.d(logTag, "onLittleSunTimerExpired($currentApp, wasWindDownSnooze=$wasWindDownSnooze)")
        if (!wasWindDownSnooze) {
            clearSession()
        } else {
            sharedOverlayViewModel.updateCurrentAppSessionEndTime(null)
        }
        checkToShowOverlay(currentApp)
    }

    private fun getEffectiveBlockedApps(): Set<String> {
        val blockedApps = sharedPreferenceService.getBlockedApps()
        return if (blockedApps.isEmpty()) FALLBACK_BLOCKED_APPS else blockedApps.toSet()
    }

    internal fun isBlockedPackage(packageName: String): Boolean {
        val blockedApps = sharedPreferenceService.getBlockedApps()
        Log.d(logTag, "isBlockedPackage() - checking $packageName against blocked apps: $blockedApps")

        // If no apps are blocked in preferences, use hardcoded test apps
        if (blockedApps.isEmpty()) {
            Log.d(logTag, "No blocked apps configured, using test apps: $FALLBACK_BLOCKED_APPS")
            return FALLBACK_BLOCKED_APPS.contains(packageName)
        }

        return blockedApps.contains(packageName)
    }

    private fun checkToShowOverlay(currentPackageName: String) {
        val syncData = sharedPreferenceService.getSyncData()
        val blockedApps = getEffectiveBlockedApps()
        Log.d(logTag, "checkToShowOverlay() - Blocked apps list: $blockedApps")

        val currentData = sharedOverlayViewModel.sharedData.value
        val entryForCurrentApp = currentData.appMap[currentPackageName]
        val activeTimer = currentData.activeTimer
        val activeTimerEndTime = activeTimer?.let { Instant.ofEpochMilli(it.endTS) }
        val currentTimeMs = System.currentTimeMillis()
        val now = Instant.ofEpochMilli(currentTimeMs)
        val sessionEndTime = entryForCurrentApp?.sessionEndTime ?: activeTimerEndTime
        val isWithinSessionLimit = sessionEndTime?.let { it > now } ?: false
        val budgetRemaining = hasBudgetRemaining(syncData)

        val sessionGrace = syncData.cfg.sessionGrace
        val sessionGraceEnabled = sessionGrace?.enabled == true
        val sessionGraceMinutes = sessionGrace?.minutes ?: 0
        val isSessionStale = entryForCurrentApp?.lastUsed?.isBefore(
            now.minusSeconds(RESET_APP_USAGE_DURATION_THRESHOLD_IN_S.toLong())
        ) == true
        val currentSessionDurationS = when {
            entryForCurrentApp == null -> 0
            isSessionStale -> 0
            else -> entryForCurrentApp.sessionDurationInS.coerceAtLeast(0)
        }

        val decision = overlayDecisionEngine.decide(
            currentPackageName,
            OverlayState(
                ownPackage = packageName,
                blockedApps = blockedApps,
                currentTime = currentTimeMs,
                lastHideAllTimestamp = lastHideAllTimestamp,
                hideToShowDebounceMs = HIDE_TO_SHOW_DEBOUNCE_MS,
                lastGoToAppTimestamp = lastGoToAppTimestamp,
                appSwitchDebounceMs = APP_SWITCH_DEBOUNCE_MS,
                isAnyOverlayShowing =
                    littleSunOverlayWindow.isWindowShown() ||
                        interactionOverlayWindow.isWindowShown() ||
                        smallMsgOverlayWindow.isWindowShown() ||
                        successSunOverlayWindow.isWindowShown(),
                isSleepWindDownOverlayShowing = sleepWindDownOverlayWindow.isWindowShown(),
                appSessionEndTime = entryForCurrentApp?.sessionEndTime?.toEpochMilli(),
                activeTimerEndTime = activeTimer?.endTS,
                activeTimerDurationS = activeTimer?.durationS,
                hasBudgetRemaining = budgetRemaining,
                sessionGraceEnabled = sessionGraceEnabled,
                sessionGraceMinutes = sessionGraceMinutes,
                currentSessionDurationS = currentSessionDurationS,
                isWindDownActive = isWindDownActive(syncData),
                isWindDownSnoozed = isWindDownSnoozed(syncData),
            )
        )

        Log.v(
            logTag,
            "checkToShowOverlay() decision=$decision sessionLimit=$isWithinSessionLimit " +
                "blocked=${blockedApps.contains(currentPackageName)} package=$currentPackageName"
        )

        fun resetStaleSessionDurationIfNeeded() {
            val currentAppData = sharedOverlayViewModel.sharedData.value.appMap[currentPackageName]
            if (currentAppData != null && currentAppData.lastUsed.isBefore(
                    Instant.now().minusSeconds(RESET_APP_USAGE_DURATION_THRESHOLD_IN_S.toLong())
                )
            ) {
                Log.v(logTag, "reset sessionDurationInS to 0")
                sharedOverlayViewModel.updateCurrentAppSessionDuration(0)
            }
        }

        when (decision) {
            OverlayDecision.HideAll -> hideAllBut()

            OverlayDecision.ShowSleepWindDown -> {
                Log.v(logTag, "Wind-down active for blocked app, showing wind-down overlay: $currentPackageName")
                showOverlay(OverlayName.SLEEP_WIND_DOWN_OVERLAY, null, currentPackageName)
            }

            OverlayDecision.ShowWindDownSnoozeTimer -> {
                Log.v(logTag, "Wind-down snoozed, showing little sun timer for: $currentPackageName")
                showWindDownSnoozeTimer(currentPackageName, syncData)
            }

            OverlayDecision.ShowLittleSun -> {
                resetStaleSessionDurationIfNeeded()
                if (isWithinSessionLimit && entryForCurrentApp?.sessionEndTime == null && activeTimerEndTime != null) {
                    // Keep per-app map in sync so Little Sun countdown can restore after process restarts.
                    sharedOverlayViewModel.updateCurrentAppSessionEndTime(activeTimerEndTime)
                } else if (!isWithinSessionLimit && budgetRemaining) {
                    val remainingSeconds = getBudgetRemainingSeconds(syncData)
                    Log.v(logTag, "Budget has ${remainingSeconds}s remaining, showing little sun (budget mode)")
                    sharedOverlayViewModel.updateCurrentAppSessionEndTime(
                        Instant.now().plusSeconds(remainingSeconds.toLong())
                    )
                }
                showOverlay(OverlayName.LITTLE_SUN_OVERLAY, null, currentPackageName)
            }

            OverlayDecision.ShowIntervention -> {
                resetStaleSessionDurationIfNeeded()
                Log.v(logTag, "No active session, SHOW FRESH INTERACTION OVERLAY for: $currentPackageName")
                showOverlay(
                    OverlayName.INTERACTION_OVERLAY,
                    OverlayMode.INTERACTION_OVERLAY__FRESH,
                    currentPackageName
                )
            }

            is OverlayDecision.Skip -> {
                Log.d(logTag, "checkToShowOverlay() - skipping: ${decision.reason}")
            }
        }
    }


    private fun hideAllBut(exclude: OverlayName? = null) {
        // Track when we hide all overlays to debounce automatic show requests
        if (exclude == null) {
            lastHideAllTimestamp = System.currentTimeMillis()
        }
        if (exclude != OverlayName.INTERACTION_OVERLAY) hideOverlay(OverlayName.INTERACTION_OVERLAY);
        if (exclude != OverlayName.SUCCESS_SUN_OVERLAY) hideOverlay(OverlayName.SUCCESS_SUN_OVERLAY);
        if (exclude != OverlayName.SMALL_MSG_OVERLAY) hideOverlay(OverlayName.SMALL_MSG_OVERLAY);
        if (exclude != OverlayName.LITTLE_SUN_OVERLAY) hideOverlay(OverlayName.LITTLE_SUN_OVERLAY);
        if (exclude != OverlayName.SLEEP_WIND_DOWN_OVERLAY) hideOverlay(OverlayName.SLEEP_WIND_DOWN_OVERLAY);
    }


    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }

    override fun onDestroy() {
        Log.d(logTag, "onDestroy() - Service is being destroyed")

        if (instance === this) {
            instance = null
        }

        // Cancel any pending screen state checks
        screenStateHandler.removeCallbacksAndMessages(null)

        // Unregister screen state receiver
        try {
            unregisterReceiver(screenStateReceiver)
        } catch (e: Exception) {
            Log.e(logTag, "Failed to unregister screen state receiver", e)
        }

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

    fun setSessionLimit(seconds: Int, intent: SessionIntent? = null) {
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

        val activeTimer = ActiveTimer(
            endTS = endTS,
            durationS = seconds,
            startedTS = now,
            target = SessionTarget("app", currentApp),
            platform = "android",
            intent = intent
        )
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

            if (isRestOfDay) {
                // Rest of day: hide everything completely
                Log.d(logTag, "setSessionLimit - rest-of-day mode, hiding all overlays")
                hideAllBut()
            } else {
                // Timed session: show Little Sun countdown
                Log.d(logTag, "setSessionLimit - showing Little Sun overlay")
                showOverlay(OverlayName.LITTLE_SUN_OVERLAY, null, currentApp)
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
        // Live service instance so the flag below reflects actual window
        // state; set in onCreate, cleared in onDestroy
        @Volatile
        private var instance: OverlayControllerService? = null

        /**
         * Authoritative flag for "an overlay that takes text input is visible"
         * (interaction or sleep wind-down window). Read by MyAccessibilityService
         * to ignore keyboard events while the user types into an overlay -
         * both services run in the same process, so querying the live window
         * state is sufficient. Computed (not stored) because windows are also
         * hidden directly by the JS interfaces, bypassing this service's
         * show/hide methods.
         */
        val isInputOverlayVisible: Boolean
            get() = instance?.isInputOverlayShown() ?: false

        const val INTENT_EXTRA_OVERLAY_NAME = "INTENT_EXTRA_OVERLAY_NAME"
        const val INTENT_EXTRA_OVERLAY_MODE = "INTENT_EXTRA_OVERLAY_MODE"
        const val INTENT_EXTRA_APP_NAME = "INTENT_EXTRA_APP_NAME"
        const val INTENT_EXTRA_COMMAND_SHOW_OVERLAY = "INTENT_EXTRA_COMMAND_SHOW_OVERLAY"
        const val INTENT_EXTRA_COMMAND_HIDE_OVERLAY = "INTENT_EXTRA_COMMAND_HIDE_OVERLAY"

        public enum class OverlayName {
            INTERACTION_OVERLAY, LITTLE_SUN_OVERLAY, SMALL_MSG_OVERLAY, SUCCESS_SUN_OVERLAY, SLEEP_WIND_DOWN_OVERLAY
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

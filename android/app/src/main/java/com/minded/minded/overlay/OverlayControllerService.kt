package com.minded.minded.overlay

import SharedPreferenceService
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.WindowManager
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
import java.time.Instant


class OverlayControllerService : Service(), LifecycleOwner, SavedStateRegistryOwner {
    private val logTag = javaClass.simpleName

    private val GRACE_PERIOD_IN_S = 30
    private val RESET_APP_USAGE_DURATION_THRESHOLD_IN_S = 30 * 60


    private var wasNoOverlaysBefore = false

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
        val windowManager: WindowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        sharedOverlayViewModel = SharedOverlayViewModel();
        // NOTE: initialization should be enough to write data
        sharedPreferenceService = SharedPreferenceService(this)
        sharedPreferenceService.writeDefaultDataIfNecessary();

        interactionOverlayWindow =
            InteractionWindow(this, sharedOverlayViewModel, windowManager)
        littleSunOverlayWindow = LittleSunWindow(this, sharedOverlayViewModel, windowManager)
        smallMsgOverlayWindow = SmallMsgWindow(this, sharedOverlayViewModel, windowManager)
        successSunOverlayWindow = SuccessSunWindow(this, sharedOverlayViewModel, windowManager)

        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)

        super.onCreate()
    }


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        val currentPackage =
            intent.getStringExtra(MyAccessibilityService.INTENT_EXTRA_CURRENT_PACKAGE_NAME)
        Log.v(logTag, "onStartCommand() $currentPackage")
        if (currentPackage != null) {
            checkToShowOverlay(currentPackage)
        } else {
            val overlayNameString = intent.getStringExtra(INTENT_EXTRA_OVERLAY_NAME)
            if (overlayNameString.isNullOrEmpty()) {
                throw RuntimeException("missing overlay name")
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


        return START_NOT_STICKY
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
                        isShowLittleSunAfterSuccess = false
                    )
                } else {
                    sharedOverlayViewModel.updateSharedData(
                        successSunTxt = "tap sun to close",
                        isShowLittleSunAfterSuccess = true
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
        return blockedApps.contains(packageName)
//        return packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
    }

    private fun checkToShowOverlay(currentPackageName: String) {
        val entryForCurrentApp = sharedOverlayViewModel.sharedData.value.appMap[currentPackageName]
        val isInGracePeriod = entryForCurrentApp?.lastUsed?.let {
            it > Instant.now().minusSeconds(GRACE_PERIOD_IN_S.toLong())
        } ?: false

        Log.v(
            logTag,
            "checkToShowOverlay() $isInGracePeriod ${isBlockedPackage(currentPackageName)} ${currentPackageName}"
        )

        if (!isBlockedPackage(currentPackageName)) {
            hideAllBut()
            return;
        }

        if (currentPackageName == "com.google.android.apps.nexuslauncher" || currentPackageName == "com.google.android.googlequicksearchbox") {
            hideAllBut()
            return;
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
            } else if (isInGracePeriod) {
                Log.v(logTag, "isInGracePeriod")
                if (!littleSunOverlayWindow.isWindowShown()) {
                    showOverlay(OverlayName.LITTLE_SUN_OVERLAY, null, currentPackageName)
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
        super.onDestroy()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
        // TODO hide all overlays

        // restart on destroy
//        val timeToInvoke = 5 * 1000
//        val intent: Intent = Intent(
//            this@CommonOverlayService, CommonOverlayService::class.java
//        )
//        val pendingIntent = PendingIntent.getService(
//            this@CommonOverlayService, 0, intent, PendingIntent.FLAG_IMMUTABLE
//        )
//        val alarm = getSystemService(ALARM_SERVICE) as AlarmManager
//        alarm.set(
//            AlarmManager.RTC_WAKEUP,
//            System.currentTimeMillis() + timeToInvoke.toLong(),
//            pendingIntent
//        )
    }

    fun userDrivenClose(isSkipShowSuccessSunAfter: Boolean = false) {
        Log.v("QuestionOverlaySVC", "userDrivenClose()")
        sharedPreferenceService.countUserDrivenClose()
        // we do this to let the sun animation finish, sun is supposed to close itself after
        if (isSkipShowSuccessSunAfter) {
            hideOverlay(OverlayName.LITTLE_SUN_OVERLAY)
            hideOverlay(OverlayName.INTERACTION_OVERLAY)
            hideOverlay(OverlayName.SMALL_MSG_OVERLAY)
        } else {
            hideAllBut()
        }
        goToApp()

        if (!isSkipShowSuccessSunAfter) {
            showOverlay(
                this,
                OverlayControllerService.Companion.OverlayName.SUCCESS_SUN_OVERLAY,
                OverlayControllerService.Companion.OverlayMode.SUCCESS_SUN_OVERLAY__FINAL
            )
        }
    }

    fun countUserDrivenClose() {
        val sharedPreferences = this.getSharedPreferences("mindedData", Context.MODE_PRIVATE)
        val str = sharedPreferences.getString("mindedAll", null);
        if (str != null) {
            val syncData = parseSyncData(str)
            Log.v(logTag, "syncData: $syncData")
        }
    }

    fun goToHomeScreen() {
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
    }

    fun goToApp() {
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
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
            context.startService(intent)
        }

        internal fun hideOverlay(
            context: Context, overlayName: OverlayName
        ) {
            val intent = Intent(context, OverlayControllerService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_OVERLAY_NAME, overlayName.name)
            context.startService(intent)
        }
    }
}

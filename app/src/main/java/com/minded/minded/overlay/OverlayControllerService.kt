package com.minded.minded.overlay

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.util.Log
import android.view.WindowManager
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import com.minded.minded.MyAccessibilityService
import com.minded.minded.data.QuestionForPrompt
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.model.DashboardViewModel
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit


class OverlayControllerService : Service(), LifecycleOwner, SavedStateRegistryOwner {
    private val logTag = javaClass.simpleName

    private var lastForeGroundApp: String = ""
    private var isInGracePeriod = false
    private val GRACE_PERIOD = 30

    private var questionToShow: QuestionForPrompt? = null
    private var questionForPrompt: QuestionForPrompt? = null
    private var answerTxt: String? = null
    private var numberOfWindowsShown = 0


    private val _lifecycleRegistry = LifecycleRegistry(this)
    private val _savedStateRegistryController: SavedStateRegistryController =
        SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry =
        _savedStateRegistryController.savedStateRegistry
    override val lifecycle: Lifecycle = _lifecycleRegistry


    private lateinit var dashboardViewModel: DashboardViewModel

    private lateinit var questionOverlayWindow: QuestionWindow
    private lateinit var afterSunOverlayWindow: AfterSunWindow
    private lateinit var reMinderMsgOverlayWindow: ReMinderMsgWindow
    private lateinit var successSunOverlayWindow: SuccessSunWindow


    override fun onCreate() {
        val answerRepository = AnswerRepository(this)
        val windowManager: WindowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        dashboardViewModel = DashboardViewModel(answerRepository)

        questionOverlayWindow = QuestionWindow(this, windowManager, dashboardViewModel)
        afterSunOverlayWindow = AfterSunWindow(this, windowManager)
        reMinderMsgOverlayWindow = ReMinderMsgWindow(this, windowManager)
        successSunOverlayWindow = SuccessSunWindow(this, windowManager)

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
                showOverlay(overlayName)
            }

            if (intent.hasExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY)) {
                hideOverlay(overlayName)
            }
        }


        return START_NOT_STICKY
    }


    private fun showOverlay(overlayName: OverlayName) {
        Log.v(logTag, "showOverlay() ${overlayName}")
        if (numberOfWindowsShown == 0) {
            _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
            _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
        }

        numberOfWindowsShown++

        when (overlayName) {
            OverlayName.QUESTION_OVERLAY -> questionOverlayWindow.showWindow()
            OverlayName.AFTER_SUN_OVERLAY -> afterSunOverlayWindow.showWindow()
            OverlayName.REMINDER_MSG_OVERLAY -> reMinderMsgOverlayWindow.showWindow()
            OverlayName.SUCCESS_SUN_OVERLAY -> successSunOverlayWindow.showWindow()
        }
    }

    private fun hideOverlay(overlayName: OverlayName) {
        numberOfWindowsShown--

        when (overlayName) {
            OverlayName.QUESTION_OVERLAY -> questionOverlayWindow.hideWindow()
            OverlayName.AFTER_SUN_OVERLAY -> afterSunOverlayWindow.hideWindow()
            OverlayName.REMINDER_MSG_OVERLAY -> reMinderMsgOverlayWindow.hideWindow()
            OverlayName.SUCCESS_SUN_OVERLAY -> successSunOverlayWindow.hideWindow()
        }

        if (numberOfWindowsShown == 0) {
            _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
            _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
        }
    }


    private fun isBlockedPackage(packageName: String): Boolean {
        return packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
    }

    private fun checkToShowOverlay(currentPackageName: String) {
        Log.v(
            logTag,
            "checkToShowOverlay() $isInGracePeriod ${isBlockedPackage(currentPackageName)} $lastForeGroundApp"
        )

        // TODO check if needed
        if (!isBlockedPackage(currentPackageName)) {
//            QuestionOverlayService.hideOverlay();
        }

        if (currentPackageName == "com.google.android.apps.nexuslauncher") {
//            QuestionOverlayService.hideOverlay();
//            AfterSunOverlayService.hideOverlay(this)
        }

        if (!isInGracePeriod && isBlockedPackage(currentPackageName) && lastForeGroundApp != currentPackageName) {
            Log.v(logTag, "SHOW OVERLAY for: $currentPackageName")
            lastForeGroundApp = currentPackageName
//            QuestionOverlayService.showOverlay()
            isInGracePeriod = true
            Executors.newSingleThreadScheduledExecutor()
                .schedule({ isInGracePeriod = false }, GRACE_PERIOD.toLong(), TimeUnit.SECONDS)
        }
        if (!isInGracePeriod) {
            lastForeGroundApp = currentPackageName
        }
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


    companion object {
        const val INTENT_EXTRA_OVERLAY_NAME = "INTENT_EXTRA_OVERLAY_NAME"
        const val INTENT_EXTRA_COMMAND_SHOW_OVERLAY = "INTENT_EXTRA_COMMAND_SHOW_OVERLAY"
        const val INTENT_EXTRA_COMMAND_HIDE_OVERLAY = "INTENT_EXTRA_COMMAND_HIDE_OVERLAY"

        public enum class OverlayName {
            QUESTION_OVERLAY,
            AFTER_SUN_OVERLAY,
            REMINDER_MSG_OVERLAY,
            SUCCESS_SUN_OVERLAY
        }

        internal fun showOverlay(
            context: Context,
            overlayName: OverlayName
        ) {
            val intent = Intent(context, OverlayControllerService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_OVERLAY_NAME, overlayName.name)
            context.startService(intent)
            Log.v("OverlayControllerService", "showOverlay() ${overlayName}")
        }

        internal fun hideOverlay(
            context: Context,
            overlayName: OverlayName
        ) {
            val intent = Intent(context, OverlayControllerService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            intent.putExtra(INTENT_EXTRA_OVERLAY_NAME, overlayName.name)
            context.startService(intent)
        }
    }
}

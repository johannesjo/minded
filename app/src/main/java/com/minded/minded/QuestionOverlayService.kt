package com.minded.minded

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import android.util.Log
import android.view.View
import android.view.WindowManager
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.compose.OverlayBig
import com.minded.minded.ui.model.DashboardViewModel
import com.minded.minded.util.getQuestionSmart
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit


class QuestionOverlayService : Service(), LifecycleOwner, SavedStateRegistryOwner {

    lateinit var windowManager: WindowManager
    lateinit var answerRepository: AnswerRepository
    private val _lifecycleRegistry = LifecycleRegistry(this)
    private val _savedStateRegistryController: SavedStateRegistryController =
        SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry =
        _savedStateRegistryController.savedStateRegistry
    override val lifecycle: Lifecycle = _lifecycleRegistry
    private var overlayView: View? = null
    private var lastForeGroundApp: String = ""
    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var scheduleFuture: ScheduledFuture<*>
    private var isInGracePeriod = false
    private val GRACE_PERIOD = 1
    private val SHOW_APP_EVERY_X = 3
    private var backToHomeScreenCount = 0


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            showOverlay()
            AfterSunOverlayService.hideOverlay(this)
        }
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY)) {
            hideOverlay()
        }
        val currentPackage =
            intent.getStringExtra(MyAccessibilityService.INTENT_EXTRA_CURRENT_PACKAGE_NAME)
        Log.v("QuestionOverlaySVC", "onStartCommand() $currentPackage")
        if (currentPackage != null) {
            checkToShowOverlay(currentPackage)
        }


        return START_STICKY
    }

    private fun isBlockedPackage(packageName: String): Boolean {
        return packageName == "com.android.chrome" || packageName == "com.google.android.youtube"
    }


    private fun checkToShowOverlay(currentPackageName: String) {
        Log.v(
            "QuestionOverlaySVC",
            "checkToShowOverlay() $isInGracePeriod ${isBlockedPackage(currentPackageName)} $lastForeGroundApp"
        )

        // TODO check if needed
//        if (!isBlockedPackage(currentPackageName)) {
//            hideOverlay();
//        }

        if (currentPackageName == "com.google.android.apps.nexuslauncher") {
            hideOverlay();
            AfterSunOverlayService.hideOverlay(this)
        }

        if (!isInGracePeriod && isBlockedPackage(currentPackageName) && lastForeGroundApp != currentPackageName) {
            Log.v("QuestionOverlaySVC", "SHOW OVERLAY for: $currentPackageName")
            lastForeGroundApp = currentPackageName
            showOverlay()
            isInGracePeriod = true
            Executors.newSingleThreadScheduledExecutor()
                .schedule({ isInGracePeriod = false }, GRACE_PERIOD.toLong(), TimeUnit.SECONDS)
        }
        if (!isInGracePeriod) {
            lastForeGroundApp = currentPackageName
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.v("QuestionOverlaySVC", "onCreate()")

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        answerRepository = AnswerRepository(this)
        dashboardViewModel = DashboardViewModel(answerRepository)


        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
    }

    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }


    override fun onDestroy() {
        super.onDestroy()
        Log.v("QuestionOverlaySVC", "onDestroy()")

        hideOverlay()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)

        // restart on destroay
        val timeToInvoke = 5 * 1000
        val intent: Intent = Intent(
            this@QuestionOverlayService, QuestionOverlayService::class.java
        )
        val pendingIntent = PendingIntent.getService(
            this@QuestionOverlayService, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )
        val alarm = getSystemService(ALARM_SERVICE) as AlarmManager
        alarm.set(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + timeToInvoke.toLong(),
            pendingIntent
        )
    }



    private fun showOverlay() {
        Log.v("QuestionOverlaySVC", "showOverlay()")
        AfterSunOverlayService.hideOverlay(this)
        if (overlayView != null) {
            Log.v("QuestionOverlaySVC", "overlay already shown - aborting")
            return
        }
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)


        val rndQuestion = getQuestionSmart(emptyList())
        var answerTxt: String? = null

        overlayView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@QuestionOverlayService)
            setViewTreeSavedStateRegistryOwner(this@QuestionOverlayService)
            setContent {
// NOTE: theme wont work since it's not an activity
//                MindedTheme {
                OverlayBig(
                    endOverlay = {
                        hideOverlay()
                    },
                    rndQuestion = rndQuestion,
                    onSubmitAnswer = {
                        Log.v("QuestionOverlaySVC", "onSubmitAnswer: $it")
                        dashboardViewModel.addAnswer(it, rndQuestion.categoryId)
                        answerTxt = it
                    },
                    onBackToMain = {
                        Log.v("QuestionOverlaySVC", "onBackToMain")
                        userDrivenClose();
                    },
                    onShowAfterSun = {
                        Log.v("QuestionOverlaySVC", "onShowAfterSun")
                        val txt = answerTxt ?: rndQuestion.t
                        AfterSunOverlayService.showOverlay(this@QuestionOverlayService, txt)
                    }
                )
            }
        }
        windowManager.addView(overlayView, getLayoutParams())

    }

    private fun userDrivenClose() {
        Log.v("QuestionOverlaySVC", "userDrivenClose()")
        // TODO count to DB
        backToHomeScreenCount++
        if (backToHomeScreenCount % SHOW_APP_EVERY_X == 0) {
            val intent = Intent(this, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(intent)
        } else {
            val intent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
        }
    }

    private fun hideOverlay() {
        Log.v(
            "QuestionOverlaySVC", "hideOverlay()"
        )
        if (overlayView == null) {
            Log.v(
                "QuestionOverlaySVC", "overlay not shown - aborting"
            )
            return
        }
        windowManager.removeView(overlayView)
        overlayView = null
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
    }

    private fun getLayoutParams(): WindowManager.LayoutParams {
        @Suppress("DEPRECATION") return WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            PixelFormat.TRANSLUCENT
        )
    }


    companion object {
        private const val INTENT_EXTRA_COMMAND_SHOW_OVERLAY = "INTENT_EXTRA_COMMAND_SHOW_OVERLAY"
        private const val INTENT_EXTRA_COMMAND_HIDE_OVERLAY = "INTENT_EXTRA_COMMAND_HIDE_OVERLAY"

        internal fun showOverlay(context: Context) {
            val intent = Intent(context, QuestionOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, QuestionOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


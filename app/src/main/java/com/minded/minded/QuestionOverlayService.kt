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
    private val GRACE_PERIOD = 1;


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            showOverlay()
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


//         TODO check if we need this
//        Handler(Looper.getMainLooper()).post(Runnable {
//            Toast.makeText(
//                this@QuestionOverlayService.applicationContext,
////                "START QuestionOverlayService",
//                "Minded is now monitoring apps you want to use less.", Toast.LENGTH_SHORT
//            ).show()
//        })
//        if (!MyUtil.isAccessibilityServiceEnabled(this)) {
//            scheduleFuture = Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate({
//                val foregroundApp = getForegroundApp(this);
//                checkToShowOverlay(foregroundApp)
//            }, 0, 500, TimeUnit.MILLISECONDS)
//        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }


    override fun onDestroy() {
        super.onDestroy()
        scheduleFuture.cancel(true)
        Log.v("QuestionOverlaySVC", "onDestroy()")

        hideOverlay()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)

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
        if (overlayView != null) {
            Log.v("QuestionOverlaySVC", "overlay already shown - aborting")
            return
        }
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)


        val rndQuestion = getQuestionSmart(emptyList())

        overlayView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@QuestionOverlayService)
            setViewTreeSavedStateRegistryOwner(this@QuestionOverlayService)
            setContent {
// NOTE: theme wont work since it's not an activity
//                MindedTheme {
                OverlayBig(removeOverlay = { hideOverlay() },
                    rndQuestion = rndQuestion,
                    onSubmitAnswer = {
                        Log.v("QuestionOverlaySVC", "onSubmitAnswer: $it")
                        dashboardViewModel.addAnswer(it, rndQuestion.categoryId)
                    },
                    onBackToMain = {
                        Log.v("QuestionOverlaySVC", "onBackToMain")
                        // TODO count
                        val intent = Intent(Intent.ACTION_MAIN).apply {
                            addCategory(Intent.CATEGORY_HOME)
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        startActivity(intent)
                    }
                )
            }
        }
        windowManager.addView(overlayView, getLayoutParams())

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


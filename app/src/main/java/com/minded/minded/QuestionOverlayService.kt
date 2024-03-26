package com.minded.minded

import OverlayBig
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.compose.ui.platform.ComposeView
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.minded.minded.MyUtil.getForegroundApp
import com.minded.minded.data.QUESTIONS
import com.minded.minded.data.answers.AnswerRepository
import com.minded.minded.ui.model.DashboardViewModel
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
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
    private var lastForeGroundApp: String = "";
    private lateinit var dashboardViewModel: DashboardViewModel
    private lateinit var scheduleFuture: ScheduledFuture<*>
    private var isInGracePeriod = false


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
        if (currentPackageName != null) {
            if (!isInGracePeriod && isBlockedPackage(currentPackageName) && lastForeGroundApp != currentPackageName) {
                Log.v("QuestionOverlaySVC", "SHOW OVERLAY for: $currentPackageName")
                showOverlay()
                isInGracePeriod = true
                Executors.newSingleThreadScheduledExecutor()
                    .schedule({ isInGracePeriod = false }, 30, TimeUnit.SECONDS)
            }
            if (!isInGracePeriod) {
                lastForeGroundApp = currentPackageName
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        Log.v("QuestionOverlaySVC", "onCreate()")
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) startMyOwnForeground() else startForeground(
            1,
            Notification()
        )

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        answerRepository = AnswerRepository(this)
        dashboardViewModel = DashboardViewModel(answerRepository)


        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
//        FloatingWidgetService.showOverlay(this)


        Handler(Looper.getMainLooper()).post(Runnable {
            Toast.makeText(
                this@QuestionOverlayService.applicationContext,
//                "START QuestionOverlayService",
                "Minded is now monitoring apps you want to use less.",
                Toast.LENGTH_SHORT
            ).show()
        })

//         TODO check if we need this
//        if (!MyUtil.isAccessibilityServiceEnabled(this)) {
//            scheduleFuture = Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate({
//                val foregroundApp = getForegroundApp(this);
//                checkToShowOverlay(foregroundApp)
//            }, 0, 500, TimeUnit.MILLISECONDS)
//        }
    }


    private fun startMyOwnForeground() {
        val NOTIFICATION_CHANNEL_ID = "com.minded.permanence"
        val channelName = "Minded Foreground Service Channel"
        val chan = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            channelName,
            NotificationManager.IMPORTANCE_NONE
        )
        chan.lightColor = Color.BLUE
        chan.lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        val manager = (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
        manager.createNotificationChannel(chan)
        val notificationBuilder = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
        val notification = notificationBuilder.setOngoing(true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
//            .setSmallIcon(R.drawable.sun_no_rays_more_contrast)
            .setSmallIcon(R.drawable.sun_no_rays_bw)
            .setContentText("Minded is running in the background")
            .setPriority(NotificationManager.IMPORTANCE_MIN)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
        startForeground(2, notification)
    }

    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }


    override fun onDestroy() {
        super.onDestroy()
        scheduleFuture.cancel(true)
        Log.v("QuestionOverlaySVC", "onDestroy()")
        Handler(Looper.getMainLooper()).post(Runnable {
            Toast.makeText(
                this@QuestionOverlayService.applicationContext,
                "DESTROY QuestionOverlayService",
                Toast.LENGTH_SHORT
            ).show()
        })


        hideOverlay()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)

        val timeToInvoke = 5 * 1000
        val intent: Intent = Intent(
            this@QuestionOverlayService,
            QuestionOverlayService::class.java
        )
        val pendingIntent = PendingIntent.getService(
            this@QuestionOverlayService, 0, intent,
            PendingIntent.FLAG_IMMUTABLE
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

        answerRepository = AnswerRepository(this)


        val context = this;
        val rndQuestion = getQuestionSmart(emptyList())

        overlayView = ComposeView(context).apply {
            setViewTreeLifecycleOwner(this@QuestionOverlayService)
            setViewTreeSavedStateRegistryOwner(this@QuestionOverlayService)
            setContent {
// NOTE: theme wont work since it's not an activity
//                MindedTheme {
                OverlayBig(
                    hideOverlay = { hideOverlay() },
                    rndQuestion = rndQuestion,
                    onSubmitAnswer = {
                        Log.v("QuestionOverlaySVC", "onSubmitAnswer: $it")
                        GlobalScope.launch {
                            // NOTE this won't update the view model of dashboard since they are separate instances
                            dashboardViewModel.addAnswer(it, rndQuestion.categoryId)
                            dashboardViewModel.loadAnswersFlow()
                        }
                    })
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
        @Suppress("DEPRECATION")
        return WindowManager.LayoutParams(
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


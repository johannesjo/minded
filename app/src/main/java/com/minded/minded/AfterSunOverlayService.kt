package com.minded.minded

import android.app.AlarmManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
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
import com.minded.minded.ui.compose.AfterSun
import com.minded.minded.ui.model.DashboardViewModel


class AfterSunOverlayService : Service(), LifecycleOwner, SavedStateRegistryOwner {

    lateinit var windowManager: WindowManager
    lateinit var answerRepository: AnswerRepository
    private val _lifecycleRegistry = LifecycleRegistry(this)
    private val _savedStateRegistryController: SavedStateRegistryController =
        SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry =
        _savedStateRegistryController.savedStateRegistry
    override val lifecycle: Lifecycle = _lifecycleRegistry
    private var overlayView: View? = null
    private lateinit var dashboardViewModel: DashboardViewModel


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            showOverlay()
        }
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY)) {
            hideOverlay()
        }
        return START_STICKY
    }

    override fun onCreate() {
        super.onCreate()
        Log.v("AfterSunOverlaySVC", "onCreate()")

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
        Log.v("AfterSunOverlaySVC", "onDestroy()")

        hideOverlay()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)

        val timeToInvoke = 5 * 1000
        val intent: Intent = Intent(
            this@AfterSunOverlayService, AfterSunOverlayService::class.java
        )
        val pendingIntent = PendingIntent.getService(
            this@AfterSunOverlayService, 0, intent, PendingIntent.FLAG_IMMUTABLE
        )
        val alarm = getSystemService(ALARM_SERVICE) as AlarmManager
        alarm.set(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + timeToInvoke.toLong(),
            pendingIntent
        )
    }

    private fun showOverlay() {
        Log.v("AfterSunOverlaySVC", "showOverlay()")
        if (overlayView != null) {
            Log.v("AfterSunOverlaySVC", "overlay already shown - aborting")
            return
        }
        startTimer()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)


        overlayView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@AfterSunOverlayService)
            setViewTreeSavedStateRegistryOwner(this@AfterSunOverlayService)
            setContent {
// NOTE: theme wont work since it's not an activity
//                MindedTheme {
                AfterSun(elapsedSeconds, {
                    Log.v("AfterSunOverlaySVC", "onSunTap()")

                    userDrivenClose();
                })
            }
        }
        windowManager.addView(overlayView, getLayoutParams())

    }

    private fun hideOverlay() {
        Log.v(
            "AfterSunOverlaySVC", "hideOverlay()"
        )
        stopTimer()
        if (overlayView == null) {
            Log.v(
                "AfterSunOverlaySVC", "overlay not shown - aborting"
            )
            return
        }
        windowManager.removeView(overlayView)
        overlayView = null
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
    }

    private fun userDrivenClose() {
        Log.v("QuestionOverlaySVC", "userDrivenClose()")
        stopTimer()
        hideOverlay()
        // TODO count to DB
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(intent)
    }

    private fun getLayoutParams(): WindowManager.LayoutParams {
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_BLUR_BEHIND, // Add FLAG_NOT_FOCUSABLE
            PixelFormat.TRANSLUCENT
        )
        params.gravity = android.view.Gravity.START or android.view.Gravity.BOTTOM
        return params;
    }


    private var elapsedSeconds by mutableStateOf(0)
    private val handler = Handler(Looper.getMainLooper())
    private val runnable = object : Runnable {
        override fun run() {
//            Log.v("AfterSunOverlaySVC", "elapsedSeconds: $elapsedSeconds")
            elapsedSeconds++
            handler.postDelayed(this, 1000)
        }
    }

    // ...

    private fun startTimer() {
        Log.v("AfterSunOverlaySVC", "startTimer()")
        elapsedSeconds = 0
        handler.post(runnable)
    }

    private fun stopTimer() {
        handler.removeCallbacks(runnable)
    }


    companion object {
        private const val INTENT_EXTRA_COMMAND_SHOW_OVERLAY = "INTENT_EXTRA_COMMAND_SHOW_OVERLAY"
        private const val INTENT_EXTRA_COMMAND_HIDE_OVERLAY = "INTENT_EXTRA_COMMAND_HIDE_OVERLAY"

        internal fun showOverlay(context: Context) {
            val intent = Intent(context, AfterSunOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, AfterSunOverlayService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


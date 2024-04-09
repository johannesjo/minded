package com.minded.minded

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.IBinder
import android.util.Log
import android.view.View
import android.view.WindowManager
import androidx.compose.runtime.Composable
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


open class CommonOverlayService : Service(), LifecycleOwner, SavedStateRegistryOwner {


    val logTag = javaClass.simpleName
    lateinit var windowManager: WindowManager
    lateinit var answerRepository: AnswerRepository
    private val _lifecycleRegistry = LifecycleRegistry(this)
    private val _savedStateRegistryController: SavedStateRegistryController =
        SavedStateRegistryController.create(this)
    override val savedStateRegistry: SavedStateRegistry =
        _savedStateRegistryController.savedStateRegistry
    override val lifecycle: Lifecycle = _lifecycleRegistry
    private var overlayView: View? = null


    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        Log.v(logTag, "onStartCommand()")
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            showOverlay()
        }
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY)) {
            hideOverlay()
        }
        return START_NOT_STICKY
    }


    fun isOverlayShown(): Boolean {
        return overlayView != null
    }


    override fun onCreate() {
        super.onCreate()
        Log.v(logTag, "onCreate()")

        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        answerRepository = AnswerRepository(this)

        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
    }

    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }


    override fun onDestroy() {
        super.onDestroy()
        hideOverlay()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)

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


    @Composable
    open fun Cmp() {
    }

    fun showOverlay() {
        if (overlayView != null) {
            Log.v(logTag, "overlay already shown - aborting")
            return
        }
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)

        overlayView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@CommonOverlayService)
            setViewTreeSavedStateRegistryOwner(this@CommonOverlayService)
            setContent {
// NOTE: theme wont work since it's not an activity
//                MindedTheme {
                Cmp()
            }
        }
        windowManager.addView(overlayView, getLayoutParams())
    }


    fun hideOverlay() {
        Log.v(
            logTag, "hideOverlay()"
        )
        if (overlayView == null) {
            Log.v(
                logTag, "overlay not shown - aborting"
            )
            return
        }
        windowManager.removeView(overlayView)
        overlayView = null
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_PAUSE)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_STOP)
    }

    open fun getLayoutParams(): WindowManager.LayoutParams {
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

    companion object {
        const val INTENT_EXTRA_COMMAND_SHOW_OVERLAY = "INTENT_EXTRA_COMMAND_SHOW_OVERLAY"
        const val INTENT_EXTRA_COMMAND_HIDE_OVERLAY = "INTENT_EXTRA_COMMAND_HIDE_OVERLAY"
    }
}


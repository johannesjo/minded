package com.minded.minded

import OverlayBig
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
import com.minded.minded.MyUtil.getForegroundApp
import com.minded.minded.data.AnswerRepository
import com.minded.minded.data.QUESTIONS
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit


class FloatingWidgetService : Service(), LifecycleOwner, SavedStateRegistryOwner {

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


    override fun onCreate() {
        super.onCreate()
        super.onCreate()
        windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        answerRepository = AnswerRepository(this)
        _savedStateRegistryController.performAttach()
        _savedStateRegistryController.performRestore(null)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_CREATE)
//        FloatingWidgetService.showOverlay(this)


        Executors.newSingleThreadScheduledExecutor().scheduleAtFixedRate({
            val foregroundApp = getForegroundApp(this);
//            Log.v("SVC", "foreground app: ${getForegroundApp(this)}")
            if (lastForeGroundApp != foregroundApp && (foregroundApp == "com.android.chrome" || foregroundApp == "com.google.android.youtube")) {
                Log.v("SVC", "foreground app: ${getForegroundApp(this)}")
                Log.v("SVC", "SHOW OVERLAY")
                FloatingWidgetService.showOverlay(this);
            }
            lastForeGroundApp = foregroundApp;
        }, 0, 200, TimeUnit.MILLISECONDS)
    }

    override fun onBind(intent: Intent?): IBinder? {
        throw RuntimeException("bound mode not supported")
    }

    override fun onStartCommand(intent: Intent, flags: Int, startId: Int): Int {
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY)) {
            showOverlay()
        }
        if (intent.hasExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY)) {
            hideOverlay()
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        hideOverlay()
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_DESTROY)
    }

    private fun showOverlay() {
        Log.v("SVC", "showOverlay()")
        if (overlayView != null) {
            Log.v("SVC", "overlay already shown - aborting")
            return
        }
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_START)
        _lifecycleRegistry.handleLifecycleEvent(Lifecycle.Event.ON_RESUME)
        val rndQuestion = QUESTIONS.random();
        overlayView = ComposeView(this).apply {
            setViewTreeLifecycleOwner(this@FloatingWidgetService)
            setViewTreeSavedStateRegistryOwner(this@FloatingWidgetService)
            setContent {
// NOTE: theme wont work since it's not an activity
//                MindedTheme {
                OverlayBig(
                    hideOverlay = { hideOverlay() },
                    rndQuestion = rndQuestion,
                    onSubmitAnswer = {
                        Log.v("SVC", "onSubmitAnswer: $it")
                        GlobalScope.launch {
                            answerRepository.createWithTimestamp(it, rndQuestion.categoryId)
                        }
                    })
            }
        }


        windowManager.addView(overlayView, getLayoutParams())
    }

    private fun hideOverlay() {
        Log.v(
            "SVC", "hideOverlay()"
        )
        if (overlayView == null) {
            Log.v(
                "SVC", "overlay not shown - aborting"
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
            val intent = Intent(context, FloatingWidgetService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_SHOW_OVERLAY, true)
            context.startService(intent)
        }

        internal fun hideOverlay(context: Context) {
            val intent = Intent(context, FloatingWidgetService::class.java)
            intent.putExtra(INTENT_EXTRA_COMMAND_HIDE_OVERLAY, true)
            context.startService(intent)
        }
    }
}


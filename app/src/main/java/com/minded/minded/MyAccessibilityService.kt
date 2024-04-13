package com.minded.minded

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.minded.minded.overlay.OverlayControllerService


class MyAccessibilityService : AccessibilityService() {


    companion object {
        const val INTENT_EXTRA_CURRENT_PACKAGE_NAME = "INTENT_EXTRA_CURRENT_PACKAGE_NAME"
    }


    override fun onCreate() {
        super.onCreate()
        Log.v("ACCESSIBILITY", "onCreate()")

    }

    override fun onInterrupt() {
        Log.v("ACCESSIBILITY", "onInterrupt()")
        // Handle interrupts
    }

    override fun onUnbind(intent: Intent?): Boolean {
        Log.v("ACCESSIBILITY", "onUnbind()")
        return super.onUnbind(intent)
        // Handle interrupts
    }


    override fun onServiceConnected() {
        Log.v("ACCESSIBILITY", "onServiceConnected()")
        // NOTE we also configure it in accessibility_service_config.xml
        // but it seems service is not working until we configure TYPE_WINDOW_STATE_CHANGED (and more?) here
        super.onServiceConnected()
        val config = AccessibilityServiceInfo()
        config.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        // Not sure if needed :(
        config.feedbackType = AccessibilityServiceInfo.FEEDBACK_VISUAL
        config.notificationTimeout = 100
        config.packageNames = arrayOf<String>()
        config.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS

        serviceInfo = config
    }


    private val handler = Handler(Looper.getMainLooper())
    private val debounceMinDelay = 200L
    private var currentPackageName: CharSequence? = null

    private val runnable = Runnable {
        Log.v("ACCESSIBILITY", "Runnable() $currentPackageName")
        val intent = Intent(this, OverlayControllerService::class.java)
        intent.putExtra(
            INTENT_EXTRA_CURRENT_PACKAGE_NAME,
            currentPackageName
        )
        startService(intent)
    }

    private fun isNonAppPackage(packageName: String): Boolean {
        // NOTE we exclude minded here too since the overlay otherwise also gets counted :/
        // TODO better solution
        return packageName.contains("com.google.android.inputmethod")
                || packageName == "com.minded.minded"
                || packageName == "com.android.systemui"
                || packageName == "com.google.android.googlequicksearchbox"
    }

    override fun onAccessibilityEvent(accessibilityEvent: AccessibilityEvent) {
        Log.v("ACCESSIBILITY", "onAccessibilityEvent()")
        Log.v(
            "ACCESSIBILITY",
            "onAccessibilityEvent(), Package name: ${accessibilityEvent.packageName}  L:$currentPackageName ${accessibilityEvent.eventType} ${accessibilityEvent.action}"
        )
        if (accessibilityEvent.packageName != null && !isNonAppPackage(accessibilityEvent.packageName.toString())) {
            currentPackageName = accessibilityEvent.packageName
            handler.removeCallbacks(runnable)
            handler.postDelayed(runnable, debounceMinDelay)
        }

    }
}

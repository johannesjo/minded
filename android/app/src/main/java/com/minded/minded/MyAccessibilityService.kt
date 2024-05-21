package com.minded.minded

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.minded.minded.overlay.OverlayControllerService


class MyAccessibilityService : AccessibilityService() {
    private var lastEventTs: Long = 0
    private val minDelayForNewEvents = 500L
    private var currentPackageName: CharSequence? = null

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

    private fun isNonAppPackage(packageName: String): Boolean {
        // NOTE we exclude minded here too since the overlay otherwise also gets counted :/
        // TODO better solution
        return packageName.contains("com.google.android.inputmethod")
                || packageName == "com.minded.minded"
                || packageName == "com.android.systemui"
//                || packageName == "com.google.android.googlequicksearchbox"
    }


    override fun onAccessibilityEvent(accessibilityEvent: AccessibilityEvent) {
        Log.v("ACCESSIBILITY", "onAccessibilityEvent() ${System.currentTimeMillis() - lastEventTs}")
        // NOTE: when using the nexuslauncher to swipe in between app, the nexuslauncher is recorded again shortly after refocusing
        // the app that is actually focused afterwards. To counter this we use the magic 500ms and don't fire the service again if the
        // last start is not at least 500ms away
        val isStartService = (System.currentTimeMillis() - lastEventTs > minDelayForNewEvents)
                && accessibilityEvent.packageName != null
                && !isNonAppPackage(accessibilityEvent.packageName.toString())
        lastEventTs = System.currentTimeMillis()
        Log.v(
            "ACCESSIBILITY",
            "onAccessibilityEvent(), Package name: s:${isStartService} ${accessibilityEvent.packageName}  L:$currentPackageName ${accessibilityEvent.eventType} ${accessibilityEvent.action}"
        )
        if (isStartService) {
            currentPackageName = accessibilityEvent.packageName
            val intent = Intent(this, OverlayControllerService::class.java)
            intent.putExtra(
                INTENT_EXTRA_CURRENT_PACKAGE_NAME,
                currentPackageName
            )
            startService(intent)

        }
    }
}

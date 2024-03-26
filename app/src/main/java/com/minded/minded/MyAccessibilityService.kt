package com.minded.minded

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent


class MyAccessibilityService : AccessibilityService() {
    companion object {
        const val INTENT_EXTRA_CURRENT_PACKAGE_NAME = "INTENT_EXTRA_CURRENT_PACKAGE_NAME"
    }


    override fun onCreate() {
        super.onCreate()
        Log.v("ACCESSIBILITY", "CREATE SVC")

    }

    override fun onInterrupt() {
        Log.v("ACCESSIBILITY", "onInterrupt()")
        // Handle interrupts
    }

    override fun onUnbind(intent: Intent?): Boolean {
        Log.v("ACCESSIBILITY", "onUnbind()")
        return super.onUnbind(intent);
        // Handle interrupts
    }


    override fun onServiceConnected() {
        // NOTE we also configure it in accessibility_service_config.xml
        // but it seems service is not working until we configure it here
        super.onServiceConnected()
        val config = AccessibilityServiceInfo()
        config.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
        config.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
        config.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
        serviceInfo = config
    }

    override fun onAccessibilityEvent(accessibilityEvent: AccessibilityEvent) {
        Log.v("ACCESSIBILITY", "onAccessibilityEvent()")

        try {
            val currentPackageName = accessibilityEvent.packageName
            Log.v("ACCESSIBILITY", "Package name: $currentPackageName")
            val intent = Intent(this, QuestionOverlayService::class.java)
            intent.putExtra(
                INTENT_EXTRA_CURRENT_PACKAGE_NAME,
                currentPackageName
            ) // replace "key" and "value" with your actual key and value
            startService(intent)
        } catch (e: Exception) {
            Log.e("ACCESSIBILITY", "Error in onAccessibilityEvent", e)
        }
    }
}

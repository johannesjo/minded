package com.minded.minded.util

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.content.Context
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityManager
import com.minded.minded.MyAccessibilityService


fun checkPermission(context: Context, permission: String): Boolean {
    val res = context.checkCallingOrSelfPermission(permission)
    return res == PackageManager.PERMISSION_GRANTED
}

fun checkUsageStatsPermission(context: Context): Boolean {
    val granted: Boolean
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    @Suppress("DEPRECATION") val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        context.packageName
    )
    granted = if (mode == AppOpsManager.MODE_DEFAULT) {
        context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED
    } else {
        mode == AppOpsManager.MODE_ALLOWED
    }

    return granted
}

fun checkDrawOverlayPermission(context: Context): Boolean {
    return Settings.canDrawOverlays(context)
}


fun isAccessibilityServiceEnabled(
    context: Context,
    serviceToCheck: Class<out AccessibilityService?> = MyAccessibilityService::class.java
): Boolean {
    val am: AccessibilityManager =
        context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
    val enabledServices: List<AccessibilityServiceInfo> =
        am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
    Log.v("ENABLED", "ENABLED SERVICES ${enabledServices.size} ")
    for (enabledService in enabledServices) {
        Log.v("ENABLED", enabledService.resolveInfo.serviceInfo.packageName)
        val enabledServiceInfo: ServiceInfo = enabledService.resolveInfo.serviceInfo
        if (enabledServiceInfo.packageName.equals(context.packageName) && enabledServiceInfo.name.equals(
                serviceToCheck.name
            )
        ) return true
    }
    return false
}

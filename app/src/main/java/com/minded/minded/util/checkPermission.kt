package com.minded.minded.util

import android.app.AppOpsManager
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Settings
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


fun isAccessibilityServiceEnabled(context: Context): Boolean {
    val contentResolver = context.contentResolver;
    val serviceName = context.packageName + "/" + MyAccessibilityService::class.java.name
    val accessibilityEnabled = Settings.Secure.getInt(
        contentResolver,
        Settings.Secure.ACCESSIBILITY_ENABLED, 0
    )
    if (accessibilityEnabled == 1) {
        val services = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        if (services != null) {
            return services.split(":").contains(serviceName)
        }
    }
    return false
}

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

fun checkIgnoringBatteryOptimizations(context: Context): Boolean {
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
    return powerManager.isIgnoringBatteryOptimizations(context.packageName)
}


fun isAccessibilityServiceEnabled(
    context: Context,
    serviceToCheck: Class<out AccessibilityService?> = MyAccessibilityService::class.java
): Boolean {
    // Method 1: Check using AccessibilityManager
    val am: AccessibilityManager =
        context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
    val enabledServices: List<AccessibilityServiceInfo> =
        am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
    Log.v("UTIL", "isAccessibilityServiceEnabled ENABLED SERVICES ${enabledServices.size} ")
    
    val expectedServiceName = serviceToCheck.name
    val expectedPackageName = context.packageName
    
    for (enabledService in enabledServices) {
        val enabledServiceInfo: ServiceInfo = enabledService.resolveInfo.serviceInfo
        Log.v("UTIL", "Checking service: ${enabledServiceInfo.packageName}/${enabledServiceInfo.name}")
        
        // Check if this is our service
        if (enabledServiceInfo.packageName == expectedPackageName && 
            enabledServiceInfo.name == expectedServiceName) {
            Log.v("UTIL", "Found our accessibility service enabled!")
            return true
        }
    }
    
    // Method 2: Check using Settings.Secure
    try {
        val enabledServicesString = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        Log.v("UTIL", "Enabled services from Settings: $enabledServicesString")
        
        if (enabledServicesString != null) {
            val colonSplitter = enabledServicesString.split(":")
            val expectedComponentName = "$expectedPackageName/$expectedServiceName"
            val expectedComponentNameShort = "$expectedPackageName/.MyAccessibilityService"
            
            for (componentName in colonSplitter) {
                Log.v("UTIL", "Checking component: $componentName")
                if (componentName == expectedComponentName || componentName == expectedComponentNameShort) {
                    Log.v("UTIL", "Found our service in Settings!")
                    return true
                }
            }
        }
    } catch (e: Exception) {
        Log.e("UTIL", "Error checking accessibility settings", e)
    }
    
    Log.v("UTIL", "Looking for: $expectedPackageName/$expectedServiceName - NOT FOUND")
    return false
}

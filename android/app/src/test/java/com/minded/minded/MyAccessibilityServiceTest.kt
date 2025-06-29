package com.minded.minded

import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.Mockito.*
import org.mockito.MockitoAnnotations
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlin.test.assertEquals

/**
 * Unit tests for MyAccessibilityService
 * 
 * These tests verify the core logic of app detection, pattern recognition,
 * and manufacturer-specific handling.
 */
@RunWith(JUnit4::class)
class MyAccessibilityServiceTest {
    
    @Mock
    private lateinit var mockPackageManager: PackageManager
    
    private lateinit var service: MyAccessibilityService
    private lateinit var serviceHelper: ServiceTestHelper
    
    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        service = MyAccessibilityService()
        serviceHelper = ServiceTestHelper(service)
        
        // Set up the mock package manager
        val packageManagerField = service::class.java.superclass.getDeclaredField("mBase")
        packageManagerField.isAccessible = true
        
        // Mock context
        val mockContext = mock(android.content.Context::class.java)
        `when`(mockContext.packageManager).thenReturn(mockPackageManager)
        packageManagerField.set(service, mockContext)
    }
    
    @Test
    fun `test dynamic launcher detection with installed launchers`() {
        // Given
        val launcherPackages = listOf(
            "com.android.launcher3",
            "com.google.android.apps.nexuslauncher",
            "com.samsung.android.app.launcher"
        )
        
        val resolveInfos = launcherPackages.map { packageName ->
            mock(ResolveInfo::class.java).apply {
                activityInfo = mock(ActivityInfo::class.java).apply {
                    `when`(this.packageName).thenReturn(packageName)
                }
            }
        }
        
        `when`(mockPackageManager.queryIntentActivities(any(Intent::class.java), anyInt()))
            .thenReturn(resolveInfos)
        
        // When
        val isLauncher = serviceHelper.callIsLauncherPackage("com.google.android.apps.nexuslauncher")
        val isNotLauncher = serviceHelper.callIsLauncherPackage("com.example.app")
        
        // Then
        assertTrue(isLauncher)
        assertFalse(isNotLauncher)
    }
    
    @Test
    fun `test system app detection with PackageManager`() {
        // Given - System app
        val systemAppInfo = mock(ApplicationInfo::class.java).apply {
            flags = ApplicationInfo.FLAG_SYSTEM
        }
        `when`(mockPackageManager.getApplicationInfo("com.android.systemui", 0))
            .thenReturn(systemAppInfo)
        
        // Given - User app
        val userAppInfo = mock(ApplicationInfo::class.java).apply {
            flags = 0
        }
        `when`(mockPackageManager.getApplicationInfo("com.example.userapp", 0))
            .thenReturn(userAppInfo)
        
        // When
        val isSystemApp = serviceHelper.callIsSystemPackage("com.android.systemui")
        val isUserApp = serviceHelper.callIsSystemPackage("com.example.userapp")
        
        // Then
        assertTrue(isSystemApp)
        assertFalse(isUserApp)
    }
    
    @Test
    fun `test manufacturer-specific system package detection for Samsung`() {
        // Given
        serviceHelper.setDeviceManufacturer("samsung")
        
        // When
        val isSamsungSystemPackage = serviceHelper.callIsManufacturerSystemPackage(
            "com.samsung.android.app.taskedge"
        )
        val isGenericSamsungPackage = serviceHelper.callIsManufacturerSystemPackage(
            "com.samsung.android.someapp"
        )
        val isNotSamsungPackage = serviceHelper.callIsManufacturerSystemPackage(
            "com.example.app"
        )
        
        // Then
        assertTrue(isSamsungSystemPackage)
        assertTrue(isGenericSamsungPackage)
        assertFalse(isNotSamsungPackage)
    }
    
    @Test
    fun `test transition pattern - launcher to app`() {
        // Given
        serviceHelper.clearTransitions()
        serviceHelper.addTransition(null, "com.android.launcher3", 1000L, "Launcher")
        serviceHelper.addTransition("com.android.launcher3", "com.example.app", 1500L, "MainActivity")
        
        // When
        val pattern = serviceHelper.callAnalyzeTransitionPattern("com.example.app", 1600L)
        
        // Then
        assertEquals("LAUNCHER_TO_APP", pattern)
    }
    
    @Test
    fun `test transition pattern - direct app switch`() {
        // Given
        serviceHelper.clearTransitions()
        serviceHelper.addTransition(null, "com.example.app1", 1000L, "MainActivity")
        serviceHelper.addTransition("com.example.app1", "com.example.app2", 1800L, "MainActivity")
        
        // When
        val pattern = serviceHelper.callAnalyzeTransitionPattern("com.example.app2", 1900L)
        
        // Then
        assertEquals("DIRECT_APP_SWITCH", pattern)
    }
    
    @Test
    fun `test transition pattern - returning to app`() {
        // Given
        serviceHelper.clearTransitions()
        serviceHelper.addTransition(null, "com.example.app", 1000L, "MainActivity")
        serviceHelper.addTransition("com.example.app", "com.android.launcher3", 2000L, "Launcher")
        serviceHelper.addTransition("com.android.launcher3", "com.example.app", 3000L, "MainActivity")
        
        // When
        val pattern = serviceHelper.callAnalyzeTransitionPattern("com.example.app", 3500L)
        
        // Then
        assertEquals("RETURNING_TO_APP", pattern)
    }
    
    @Test
    fun `test notification shade pattern detection`() {
        // Given
        serviceHelper.clearTransitions()
        serviceHelper.addTransition("com.example.app", "com.android.systemui", 1000L, "StatusBar")
        serviceHelper.addTransition("com.android.systemui", "com.example.app", 1500L, "MainActivity")
        
        // When
        val pattern = serviceHelper.callAnalyzeTransitionPattern("com.example.app", 1600L)
        
        // Then
        assertEquals("NOTIFICATION_PULL", pattern)
    }
    
    @Test
    fun `test valid app window detection`() {
        // Test various window types
        assertTrue(serviceHelper.callIsValidAppWindow("com.example.MainActivity", "", ""))
        assertTrue(serviceHelper.callIsValidAppWindow("com.example.app.LauncherActivity", "", ""))
        assertTrue(serviceHelper.callIsValidAppWindow("android.webkit.WebView", "", ""))
        assertTrue(serviceHelper.callIsValidAppWindow("androidx.recyclerview.widget.RecyclerView", "", ""))
        assertTrue(serviceHelper.callIsValidAppWindow("android.widget.FrameLayout", "", ""))
        
        assertFalse(serviceHelper.callIsValidAppWindow("android.app.Dialog", "", ""))
        assertFalse(serviceHelper.callIsValidAppWindow("android.widget.PopupWindow", "", ""))
        assertFalse(serviceHelper.callIsValidAppWindow("android.widget.Toast", "", ""))
    }
    
    @Test
    fun `test manufacturer-specific debounce times`() {
        assertEquals(600L, serviceHelper.callGetManufacturerDebounceTime("samsung"))
        assertEquals(700L, serviceHelper.callGetManufacturerDebounceTime("xiaomi"))
        assertEquals(400L, serviceHelper.callGetManufacturerDebounceTime("oneplus"))
        assertEquals(600L, serviceHelper.callGetManufacturerDebounceTime("oppo"))
        assertEquals(500L, serviceHelper.callGetManufacturerDebounceTime("google")) // default
    }
    
    @Test
    fun `test should trigger overlay - various scenarios`() {
        // Scenario 1: Direct launch from launcher - should trigger
        serviceHelper.clearTransitions()
        serviceHelper.addTransition(null, "com.android.launcher3", 900L, "Launcher")
        serviceHelper.addTransition("com.android.launcher3", "com.example.app", 1000L, "MainActivity")
        serviceHelper.setLastPackageName("com.android.launcher3")
        serviceHelper.setLastEventTimestamp(1000L)
        assertTrue(serviceHelper.callShouldTriggerOverlay("com.example.app", 1500L))
        
        // Scenario 2: Launcher package itself - should not trigger
        assertFalse(serviceHelper.callShouldTriggerOverlay("com.android.launcher3", 3000L))
        
        // Scenario 3: Same package - should not trigger
        serviceHelper.setLastPackageName("com.example.app")
        assertFalse(serviceHelper.callShouldTriggerOverlay("com.example.app", 3500L))
    }
    
    /**
     * Helper class to access private methods and fields of MyAccessibilityService
     */
    class ServiceTestHelper(private val service: MyAccessibilityService) {
        
        fun callIsLauncherPackage(packageName: String): Boolean {
            val method = service::class.java.getDeclaredMethod("isLauncherPackage", String::class.java)
            method.isAccessible = true
            return method.invoke(service, packageName) as Boolean
        }
        
        fun callIsSystemPackage(packageName: String): Boolean {
            val method = service::class.java.getDeclaredMethod("isSystemPackage", String::class.java)
            method.isAccessible = true
            return method.invoke(service, packageName) as Boolean
        }
        
        fun callIsManufacturerSystemPackage(packageName: String): Boolean {
            val method = service::class.java.getDeclaredMethod("isManufacturerSystemPackage", String::class.java)
            method.isAccessible = true
            return method.invoke(service, packageName) as Boolean
        }
        
        fun callAnalyzeTransitionPattern(packageName: String, timestamp: Long): String {
            val method = service::class.java.getDeclaredMethod(
                "analyzeTransitionPattern", 
                String::class.java, 
                Long::class.javaObjectType
            )
            method.isAccessible = true
            val result = method.invoke(service, packageName, timestamp)
            return result.toString()
        }
        
        fun callIsValidAppWindow(className: String, eventText: String, contentDesc: String): Boolean {
            val method = service::class.java.getDeclaredMethod(
                "isValidAppWindow",
                String::class.java,
                String::class.java,
                String::class.java
            )
            method.isAccessible = true
            return method.invoke(service, className, eventText, contentDesc) as Boolean
        }
        
        fun callGetManufacturerDebounceTime(manufacturer: String): Long {
            setDeviceManufacturer(manufacturer)
            val method = service::class.java.getDeclaredMethod("getManufacturerDebounceTime")
            method.isAccessible = true
            return method.invoke(service) as Long
        }
        
        fun callShouldTriggerOverlay(packageName: String, timestamp: Long): Boolean {
            val method = service::class.java.getDeclaredMethod(
                "shouldTriggerOverlay",
                String::class.java,
                Long::class.javaObjectType
            )
            method.isAccessible = true
            return method.invoke(service, packageName, timestamp) as Boolean
        }
        
        fun setDeviceManufacturer(manufacturer: String) {
            val field = service::class.java.getDeclaredField("deviceManufacturer")
            field.isAccessible = true
            field.set(service, manufacturer)
        }
        
        fun setLastPackageName(packageName: String?) {
            val field = service::class.java.getDeclaredField("lastPackageName")
            field.isAccessible = true
            field.set(service, packageName)
        }
        
        fun setLastEventTimestamp(timestamp: Long) {
            val field = service::class.java.getDeclaredField("lastEventTimestamp")
            field.isAccessible = true
            field.set(service, timestamp)
        }
        
        fun addTransition(fromPackage: String?, toPackage: String, timestamp: Long, className: String) {
            val transitionClass = service::class.java.declaredClasses
                .find { it.simpleName == "AppTransition" }!!
            
            val transition = transitionClass.getDeclaredConstructor(
                String::class.java,
                String::class.java,
                Long::class.javaObjectType,
                String::class.java,
                String::class.java
            ).apply { isAccessible = true }
                .newInstance(fromPackage, toPackage, timestamp, "window_state_changed", className)
            
            val transitionHistoryField = service::class.java.getDeclaredField("transitionHistory")
            transitionHistoryField.isAccessible = true
            val transitionHistory = transitionHistoryField.get(service) as MutableList<Any>
            transitionHistory.add(transition)
        }
        
        fun clearTransitions() {
            val field = service::class.java.getDeclaredField("transitionHistory")
            field.isAccessible = true
            val transitionHistory = field.get(service) as MutableList<Any>
            transitionHistory.clear()
        }
    }
}
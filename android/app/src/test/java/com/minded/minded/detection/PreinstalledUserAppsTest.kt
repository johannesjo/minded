package com.minded.minded.detection

import org.junit.Test
import kotlin.test.assertTrue

class PreinstalledUserAppsTest {

    // User feedback: Google and Gmail were missing from the app picker, since
    // both ship as system apps on most phones.
    @Test
    fun `Gmail and the Google app count as user apps`() {
        assertTrue("com.google.android.gm" in PreinstalledUserApps.packages)
        assertTrue("com.google.android.googlequicksearchbox" in PreinstalledUserApps.packages)
    }

    @Test
    fun `Chrome and YouTube stay pickable`() {
        assertTrue("com.android.chrome" in PreinstalledUserApps.packages)
        assertTrue("com.google.android.youtube" in PreinstalledUserApps.packages)
    }
}

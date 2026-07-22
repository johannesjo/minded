package com.minded.minded.overlay

import kotlin.test.Test
import kotlin.test.assertEquals

class LoadingSkyTest {

    @Test
    fun `daylight blends through the WebView sky keyframes`() {
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.DAWN, LoadingSkyFrame.MORNING, 0f),
            loadingSkyBlendAt(6.0),
        )
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.DAWN, LoadingSkyFrame.MORNING, 0.5f),
            loadingSkyBlendAt(7.5),
        )
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.MORNING, LoadingSkyFrame.MIDDAY, 0.5f),
            loadingSkyBlendAt(11.0),
        )
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.MIDDAY, LoadingSkyFrame.AFTERNOON, 0.5f),
            loadingSkyBlendAt(14.75),
        )
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.AFTERNOON, LoadingSkyFrame.DUSK, 0.5f),
            loadingSkyBlendAt(17.75),
        )
    }

    @Test
    fun `night uses the dark sky at the same boundaries as the WebView`() {
        assertEquals(LoadingSkyBlend.dark(), loadingSkyBlendAt(5.999))
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.DAWN, LoadingSkyFrame.MORNING, 0f),
            loadingSkyBlendAt(6.0),
        )
        assertEquals(
            LoadingSkyBlend(LoadingSkyFrame.AFTERNOON, LoadingSkyFrame.DUSK, 0.9996f),
            loadingSkyBlendAt(18.999),
        )
        assertEquals(LoadingSkyBlend.dark(), loadingSkyBlendAt(19.0))
    }
}

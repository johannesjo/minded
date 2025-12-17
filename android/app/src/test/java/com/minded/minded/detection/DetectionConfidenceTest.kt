package com.minded.minded.detection

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for DetectionConfidence class.
 *
 * Tests the weighted confidence calculation and factory methods.
 */
class DetectionConfidenceTest {

    // ==================== Overall Score Calculation ====================

    @Test
    fun `overall score should be weighted average of all factors`() {
        val confidence = DetectionConfidence(
            patternMatch = 1.0f,
            sourceReliability = 1.0f,
            crossValidation = 1.0f,
            historicalMatch = 1.0f,
            timelineCoherence = 1.0f
        )
        // 1.0 * 0.45 + 1.0 * 0.25 + 1.0 * 0.15 + 1.0 * 0.08 + 1.0 * 0.07 = 1.0
        assertEquals(1.0f, confidence.overall, 0.001f)
    }

    @Test
    fun `overall score should be zero when all factors are zero`() {
        val confidence = DetectionConfidence(
            patternMatch = 0f,
            sourceReliability = 0f,
            crossValidation = 0f,
            historicalMatch = 0f,
            timelineCoherence = 0f
        )
        assertEquals(0f, confidence.overall, 0.001f)
    }

    @Test
    fun `patternMatch should have 45 percent weight`() {
        val confidence = DetectionConfidence(patternMatch = 1.0f)
        assertEquals(0.45f, confidence.overall, 0.001f)
    }

    @Test
    fun `sourceReliability should have 25 percent weight`() {
        val confidence = DetectionConfidence(sourceReliability = 1.0f)
        assertEquals(0.25f, confidence.overall, 0.001f)
    }

    @Test
    fun `crossValidation should have 15 percent weight`() {
        val confidence = DetectionConfidence(crossValidation = 1.0f)
        assertEquals(0.15f, confidence.overall, 0.001f)
    }

    @Test
    fun `historicalMatch should have 8 percent weight`() {
        val confidence = DetectionConfidence(historicalMatch = 1.0f)
        assertEquals(0.08f, confidence.overall, 0.001f)
    }

    @Test
    fun `timelineCoherence should have 7 percent weight`() {
        val confidence = DetectionConfidence(timelineCoherence = 1.0f)
        assertEquals(0.07f, confidence.overall, 0.001f)
    }

    @Test
    fun `overall score should be clamped to max 1_0`() {
        val confidence = DetectionConfidence(
            patternMatch = 2.0f,
            sourceReliability = 2.0f,
            crossValidation = 2.0f,
            historicalMatch = 2.0f,
            timelineCoherence = 2.0f
        )
        assertEquals(1.0f, confidence.overall, 0.001f)
    }

    @Test
    fun `overall score should be clamped to min 0`() {
        val confidence = DetectionConfidence(
            patternMatch = -1.0f,
            sourceReliability = -1.0f,
            crossValidation = -1.0f,
            historicalMatch = -1.0f,
            timelineCoherence = -1.0f
        )
        assertEquals(0f, confidence.overall, 0.001f)
    }

    // ==================== Confidence Levels ====================

    @Test
    fun `level should be HIGH when overall is at or above 0_80`() {
        val highConfidence = DetectionConfidence(
            patternMatch = 1.0f,
            sourceReliability = 1.0f,
            crossValidation = 1.0f,
            historicalMatch = 1.0f,
            timelineCoherence = 1.0f
        )
        assertEquals(ConfidenceLevel.HIGH, highConfidence.level)

        // Exactly at threshold
        val atThreshold = DetectionConfidence(
            patternMatch = 0.95f,
            sourceReliability = 0.80f,
            crossValidation = 0.60f,
            historicalMatch = 0.50f,
            timelineCoherence = 0.50f
        )
        // 0.95*0.45 + 0.80*0.25 + 0.60*0.15 + 0.50*0.08 + 0.50*0.07 = 0.4275 + 0.20 + 0.09 + 0.04 + 0.035 = 0.7925
        assertTrue(atThreshold.overall >= 0.79f)
    }

    @Test
    fun `level should be MEDIUM when overall is between 0_60 and 0_80`() {
        val mediumConfidence = DetectionConfidence(
            patternMatch = 0.80f,
            sourceReliability = 0.70f,
            crossValidation = 0.50f,
            historicalMatch = 0.50f,
            timelineCoherence = 0.50f
        )
        // 0.80*0.45 + 0.70*0.25 + 0.50*0.15 + 0.50*0.08 + 0.50*0.07 = 0.36 + 0.175 + 0.075 + 0.04 + 0.035 = 0.685
        assertEquals(ConfidenceLevel.MEDIUM, mediumConfidence.level)
    }

    @Test
    fun `level should be LOW when overall is between 0_40 and 0_60`() {
        val lowConfidence = DetectionConfidence(
            patternMatch = 0.60f,
            sourceReliability = 0.50f,
            crossValidation = 0.40f,
            historicalMatch = 0.40f,
            timelineCoherence = 0.40f
        )
        // 0.60*0.45 + 0.50*0.25 + 0.40*0.15 + 0.40*0.08 + 0.40*0.07 = 0.27 + 0.125 + 0.06 + 0.032 + 0.028 = 0.515
        assertEquals(ConfidenceLevel.LOW, lowConfidence.level)
    }

    @Test
    fun `level should be VERY_LOW when overall is below 0_40`() {
        val veryLowConfidence = DetectionConfidence(
            patternMatch = 0.20f,
            sourceReliability = 0.20f,
            crossValidation = 0.20f,
            historicalMatch = 0.20f,
            timelineCoherence = 0.20f
        )
        // 0.20 * (0.45 + 0.25 + 0.15 + 0.08 + 0.07) = 0.20 * 1.0 = 0.20
        assertEquals(ConfidenceLevel.VERY_LOW, veryLowConfidence.level)
    }

    // ==================== Factory Methods ====================

    @Test
    fun `hybridValidated should return HIGH confidence`() {
        val confidence = DetectionConfidence.hybridValidated()
        assertEquals(ConfidenceLevel.HIGH, confidence.level)
        assertTrue(confidence.overall >= 0.95f)
    }

    @Test
    fun `hybridValidated should have maximum cross validation`() {
        val confidence = DetectionConfidence.hybridValidated()
        assertEquals(1.0f, confidence.crossValidation, 0.001f)
    }

    @Test
    fun `accessibilityOnly with high pattern match should return HIGH confidence`() {
        val confidence = DetectionConfidence.accessibilityOnly(0.95f)
        assertEquals(ConfidenceLevel.HIGH, confidence.level)
    }

    @Test
    fun `accessibilityOnly with medium pattern match should return MEDIUM confidence`() {
        val confidence = DetectionConfidence.accessibilityOnly(0.50f)
        // 0.50*0.45 + 0.95*0.25 + 0.70*0.15 + 0.80*0.08 + 0.85*0.07
        // = 0.225 + 0.2375 + 0.105 + 0.064 + 0.0595 = 0.691
        assertEquals(ConfidenceLevel.MEDIUM, confidence.level)
    }

    @Test
    fun `accessibilityOnly with low pattern match should return LOW confidence`() {
        val confidence = DetectionConfidence.accessibilityOnly(0.15f)
        // 0.15*0.45 + 0.95*0.25 + 0.70*0.15 + 0.80*0.08 + 0.85*0.07
        // = 0.0675 + 0.2375 + 0.105 + 0.064 + 0.0595 = 0.5335
        assertEquals(ConfidenceLevel.LOW, confidence.level)
    }

    @Test
    fun `accessibilityOnly should have neutral cross validation`() {
        val confidence = DetectionConfidence.accessibilityOnly(0.80f)
        assertEquals(0.70f, confidence.crossValidation, 0.001f)
    }

    @Test
    fun `usageStatsOnly should return MEDIUM confidence`() {
        val confidence = DetectionConfidence.usageStatsOnly()
        // 0.60*0.45 + 0.70*0.25 + 0.50*0.15 + 0.60*0.08 + 0.70*0.07
        // = 0.27 + 0.175 + 0.075 + 0.048 + 0.049 = 0.617
        assertEquals(ConfidenceLevel.MEDIUM, confidence.level)
    }

    @Test
    fun `usageStatsOnly should have lower reliability than accessibilityOnly`() {
        val usageStats = DetectionConfidence.usageStatsOnly()
        val accessibility = DetectionConfidence.accessibilityOnly(0.60f)
        assertTrue(usageStats.sourceReliability < accessibility.sourceReliability)
    }

    // ==================== Threshold Constants ====================

    @Test
    fun `HIGH_THRESHOLD should be 0_80`() {
        assertEquals(0.80f, DetectionConfidence.HIGH_THRESHOLD, 0.001f)
    }

    @Test
    fun `MEDIUM_THRESHOLD should be 0_60`() {
        assertEquals(0.60f, DetectionConfidence.MEDIUM_THRESHOLD, 0.001f)
    }

    @Test
    fun `LOW_THRESHOLD should be 0_40`() {
        assertEquals(0.40f, DetectionConfidence.LOW_THRESHOLD, 0.001f)
    }

    // ==================== Edge Cases ====================

    @Test
    fun `default values should all be zero`() {
        val confidence = DetectionConfidence()
        assertEquals(0f, confidence.patternMatch, 0.001f)
        assertEquals(0f, confidence.sourceReliability, 0.001f)
        assertEquals(0f, confidence.crossValidation, 0.001f)
        assertEquals(0f, confidence.historicalMatch, 0.001f)
        assertEquals(0f, confidence.timelineCoherence, 0.001f)
    }

    @Test
    fun `copy should preserve unchanged values`() {
        val original = DetectionConfidence.hybridValidated()
        val modified = original.copy(crossValidation = 0.5f)

        assertEquals(original.patternMatch, modified.patternMatch, 0.001f)
        assertEquals(original.sourceReliability, modified.sourceReliability, 0.001f)
        assertEquals(0.5f, modified.crossValidation, 0.001f)
        assertEquals(original.historicalMatch, modified.historicalMatch, 0.001f)
        assertEquals(original.timelineCoherence, modified.timelineCoherence, 0.001f)
    }

    // ==================== Real-World Scenario Tests ====================

    @Test
    fun `launcher to app pattern should have HIGH confidence`() {
        // LAUNCHER_TO_APP has pattern confidence of 0.95
        val confidence = DetectionConfidence.accessibilityOnly(0.95f)
        assertEquals(ConfidenceLevel.HIGH, confidence.level)
    }

    @Test
    fun `direct app switch pattern should have HIGH confidence`() {
        // DIRECT_APP_SWITCH has pattern confidence of 0.85
        val confidence = DetectionConfidence.accessibilityOnly(0.85f)
        assertEquals(ConfidenceLevel.HIGH, confidence.level)
    }

    @Test
    fun `unknown pattern should have MEDIUM confidence`() {
        // UNKNOWN has pattern confidence of 0.50
        val confidence = DetectionConfidence.accessibilityOnly(0.50f)
        assertEquals(ConfidenceLevel.MEDIUM, confidence.level)
    }

    @Test
    fun `notification pull pattern should have LOW confidence`() {
        // NOTIFICATION_PULL has pattern confidence of 0.15
        val confidence = DetectionConfidence.accessibilityOnly(0.15f)
        assertEquals(ConfidenceLevel.LOW, confidence.level)
    }

    @Test
    fun `recents browsing pattern should have VERY_LOW confidence`() {
        // RECENTS_BROWSING has pattern confidence of 0.10
        val confidence = DetectionConfidence.accessibilityOnly(0.10f)
        assertEquals(ConfidenceLevel.VERY_LOW, confidence.level)
    }
}

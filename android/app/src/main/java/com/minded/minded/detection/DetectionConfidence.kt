package com.minded.minded.detection

/**
 * Represents confidence levels for app detection decisions.
 *
 * The overall confidence is calculated as a weighted average of multiple factors:
 * - patternMatch: How well the transition matches known patterns (30%)
 * - sourceReliability: How reliable the detection source is (25%)
 * - crossValidation: Whether backup detection agrees (25%)
 * - historicalMatch: Whether this matches recent history (10%)
 * - timelineCoherence: Whether timing makes sense (10%)
 */
data class DetectionConfidence(
    val patternMatch: Float = 0f,
    val sourceReliability: Float = 0f,
    val crossValidation: Float = 0f,
    val historicalMatch: Float = 0f,
    val timelineCoherence: Float = 0f
) {
    /**
     * Overall confidence score (0.0 - 1.0)
     */
    val overall: Float
        get() = (patternMatch * 0.30f +
                sourceReliability * 0.25f +
                crossValidation * 0.25f +
                historicalMatch * 0.10f +
                timelineCoherence * 0.10f).coerceIn(0f, 1f)

    /**
     * Returns the confidence level category.
     */
    val level: ConfidenceLevel
        get() = when {
            overall >= HIGH_THRESHOLD -> ConfidenceLevel.HIGH
            overall >= MEDIUM_THRESHOLD -> ConfidenceLevel.MEDIUM
            overall >= LOW_THRESHOLD -> ConfidenceLevel.LOW
            else -> ConfidenceLevel.VERY_LOW
        }

    companion object {
        const val HIGH_THRESHOLD = 0.85f
        const val MEDIUM_THRESHOLD = 0.65f
        const val LOW_THRESHOLD = 0.45f

        /**
         * Creates a high-confidence result (AccessibilityService + UsageStats agree)
         */
        fun hybridValidated(): DetectionConfidence = DetectionConfidence(
            patternMatch = 0.95f,
            sourceReliability = 0.99f,
            crossValidation = 1.0f,
            historicalMatch = 0.90f,
            timelineCoherence = 0.95f
        )

        /**
         * Creates a confidence result for AccessibilityService-only detection
         */
        fun accessibilityOnly(patternMatch: Float): DetectionConfidence = DetectionConfidence(
            patternMatch = patternMatch,
            sourceReliability = 0.95f,
            crossValidation = 0.5f, // No validation
            historicalMatch = 0.80f,
            timelineCoherence = 0.85f
        )

        /**
         * Creates a confidence result for UsageStats-only detection (fallback mode)
         */
        fun usageStatsOnly(): DetectionConfidence = DetectionConfidence(
            patternMatch = 0.60f,
            sourceReliability = 0.70f,
            crossValidation = 0.5f,
            historicalMatch = 0.60f,
            timelineCoherence = 0.70f
        )
    }
}

enum class ConfidenceLevel {
    /**
     * Very high confidence (>= 0.85) - show overlay immediately
     */
    HIGH,

    /**
     * Medium confidence (0.65-0.85) - wait briefly for validation
     */
    MEDIUM,

    /**
     * Low confidence (0.45-0.65) - require longer validation
     */
    LOW,

    /**
     * Very low confidence (< 0.45) - ignore the detection
     */
    VERY_LOW
}

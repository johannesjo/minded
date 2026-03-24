package com.minded.minded.detection

import android.content.Context
import android.util.Log
import com.minded.minded.util.ForegroundAppResult
import com.minded.minded.util.getForegroundAppReliable
import java.util.Collections
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

/**
 * Hybrid app detector that combines AccessibilityService (primary, real-time)
 * with UsageStatsManager (backup, validation) for maximum detection reliability.
 *
 * Architecture:
 * 1. AccessibilityService provides real-time detection (10-100ms latency)
 * 2. UsageStatsManager polls periodically to validate and as fallback
 * 3. Confidence scoring determines whether to act on a detection
 * 4. Service health monitoring detects when AccessibilityService dies
 */
class HybridAppDetector(private val context: Context) {

    private var scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // Health monitoring
    val healthMonitor = ServiceHealthMonitor()

    // Last known foreground app from each source
    private val _accessibilityDetectedApp = MutableStateFlow<AppDetectionEvent?>(null)
    val accessibilityDetectedApp: StateFlow<AppDetectionEvent?> = _accessibilityDetectedApp.asStateFlow()

    private val _usageStatsDetectedApp = MutableStateFlow<String?>(null)
    val usageStatsDetectedApp: StateFlow<String?> = _usageStatsDetectedApp.asStateFlow()

    // Validated detections (high confidence)
    private val _validatedDetections = MutableSharedFlow<ValidatedDetection>(replay = 0)
    val validatedDetections: SharedFlow<ValidatedDetection> = _validatedDetections.asSharedFlow()

    // Detection mode
    private val _detectionMode = MutableStateFlow(DetectionMode.HYBRID)
    val detectionMode: StateFlow<DetectionMode> = _detectionMode.asStateFlow()

    // Polling job for UsageStatsManager
    private var usageStatsPollingJob: Job? = null

    // Track detection discrepancies for debugging
    private val detectionDiscrepancies = Collections.synchronizedList(mutableListOf<DetectionDiscrepancy>())

    // Callback to check if an app is blocked (for fallback detection)
    private var isBlockedAppCallback: ((String) -> Boolean)? = null

    /**
     * Sets a callback to check if an app is blocked.
     * Used by fallback detection to only emit detections for blocked apps.
     */
    fun setBlockedAppChecker(checker: (String) -> Boolean) {
        isBlockedAppCallback = checker
    }

    companion object {
        private const val TAG = "HybridAppDetector"
        private const val USAGE_STATS_POLL_INTERVAL_MS = 500L // Poll every 500ms for faster detection of slow-loading apps
        private const val VALIDATION_RETRY_DELAY_MS = 150L // Delay before retrying validation
        private const val MISSED_DETECTION_THRESHOLD_MS = 800L // Trigger fallback after 800ms without A11y events
        private const val DISCREPANCY_LOG_SIZE = 20
    }

    /**
     * Starts the hybrid detection system.
     */
    fun start() {
        Log.d(TAG, "Starting hybrid app detector")
        // Cancel previous scope if start() is called without stop()
        if (scope.isActive) {
            scope.cancel()
        }
        scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        healthMonitor.startMonitoring()
        startUsageStatsPolling()

        // Switch to fallback mode if AccessibilityService becomes unhealthy
        healthMonitor.setOnUnhealthyCallback {
            Log.w(TAG, "AccessibilityService unhealthy - switching to fallback mode")
            _detectionMode.value = DetectionMode.USAGE_STATS_FALLBACK
        }
    }

    /**
     * Stops the hybrid detection system.
     */
    fun stop() {
        Log.d(TAG, "Stopping hybrid app detector")
        usageStatsPollingJob?.cancel()
        healthMonitor.stopMonitoring()
        healthMonitor.cleanup()
        scope.cancel()
    }

    /**
     * Called when AccessibilityService detects an app change.
     * This is the primary detection method.
     *
     * @param packageName The detected package name
     * @param pattern The transition pattern that was detected
     * @param patternConfidence Confidence in the pattern match (0.0-1.0)
     */
    suspend fun onAccessibilityEvent(
        packageName: String,
        pattern: String,
        patternConfidence: Float
    ) {
        healthMonitor.recordEvent()

        // If we were in fallback mode, switch back to hybrid
        if (_detectionMode.value == DetectionMode.USAGE_STATS_FALLBACK) {
            Log.i(TAG, "AccessibilityService recovered - switching back to hybrid mode")
            _detectionMode.value = DetectionMode.HYBRID
        }

        val event = AppDetectionEvent(
            packageName = packageName,
            timestamp = System.currentTimeMillis(),
            source = DetectionSource.ACCESSIBILITY_SERVICE,
            pattern = pattern
        )
        _accessibilityDetectedApp.value = event

        // Calculate initial confidence based on pattern
        val initialConfidence = DetectionConfidence.accessibilityOnly(patternConfidence)

        // For high confidence patterns, act immediately
        if (initialConfidence.level == ConfidenceLevel.HIGH) {
            Log.d(TAG, "High confidence detection: $packageName (${initialConfidence.overall})")
            emitValidatedDetection(packageName, initialConfidence, validated = false)
            return
        }

        // For medium/low confidence, validate with UsageStatsManager
        val validatedConfidence = validateWithUsageStats(packageName, initialConfidence)

        when (validatedConfidence.level) {
            ConfidenceLevel.HIGH, ConfidenceLevel.MEDIUM -> {
                Log.d(TAG, "Validated detection: $packageName (${validatedConfidence.overall})")
                emitValidatedDetection(packageName, validatedConfidence, validated = true)
            }
            ConfidenceLevel.LOW -> {
                // Wait a bit more and try again
                delay(300)
                val revalidated = validateWithUsageStats(packageName, initialConfidence)
                if (revalidated.level != ConfidenceLevel.VERY_LOW) {
                    Log.d(TAG, "Delayed validated detection: $packageName (${revalidated.overall})")
                    emitValidatedDetection(packageName, revalidated, validated = true)
                } else {
                    Log.d(TAG, "Detection rejected after delay: $packageName")
                }
            }
            ConfidenceLevel.VERY_LOW -> {
                Log.d(TAG, "Low confidence detection ignored: $packageName (${validatedConfidence.overall})")
            }
        }
    }

    /**
     * Validates an AccessibilityService detection against UsageStatsManager.
     * Retries once after a short delay if the initial result is stale or disagrees.
     */
    private suspend fun validateWithUsageStats(
        packageName: String,
        initialConfidence: DetectionConfidence
    ): DetectionConfidence {
        val result = validateWithUsageStatsOnce(packageName, initialConfidence)

        // Retry if stale or disagreeing - UsageStats has inherent 500-2000ms delay
        return when {
            result.shouldRetry -> {
                Log.v(TAG, "UsageStats validation inconclusive, retrying after ${VALIDATION_RETRY_DELAY_MS}ms")
                delay(VALIDATION_RETRY_DELAY_MS)
                val retryResult = validateWithUsageStatsOnce(packageName, initialConfidence)
                retryResult.confidence
            }
            else -> result.confidence
        }
    }

    /**
     * Result of a single UsageStats validation attempt.
     */
    private data class ValidationResult(
        val confidence: DetectionConfidence,
        val shouldRetry: Boolean
    )

    /**
     * Performs a single UsageStats validation attempt.
     */
    private fun validateWithUsageStatsOnce(
        packageName: String,
        initialConfidence: DetectionConfidence
    ): ValidationResult {
        val usageStatsResult = getForegroundAppReliable(context)

        return when (usageStatsResult) {
            is ForegroundAppResult.Success -> {
                if (usageStatsResult.packageName == packageName) {
                    // Both sources agree - high confidence, no retry needed
                    Log.v(TAG, "UsageStats validates: $packageName")
                    ValidationResult(DetectionConfidence.hybridValidated(), shouldRetry = false)
                } else {
                    // Sources disagree - worth retrying as UsageStats may be lagging
                    logDiscrepancy(packageName, usageStatsResult.packageName)
                    ValidationResult(
                        initialConfidence.copy(crossValidation = 0.3f),
                        shouldRetry = true
                    )
                }
            }
            is ForegroundAppResult.Stale -> {
                // UsageStats data is stale - retry to get fresher data
                Log.v(TAG, "UsageStats stale, will retry")
                ValidationResult(initialConfidence, shouldRetry = true)
            }
            is ForegroundAppResult.NoAppDetected -> {
                // No recent app detected - retry once
                ValidationResult(
                    initialConfidence.copy(crossValidation = 0.4f),
                    shouldRetry = true
                )
            }
            is ForegroundAppResult.NoPermission -> {
                // No permission - can't validate, no point retrying
                Log.w(TAG, "UsageStats permission not granted, cannot validate")
                ValidationResult(initialConfidence, shouldRetry = false)
            }
            is ForegroundAppResult.Error -> {
                // Error - no point retrying
                Log.e(TAG, "UsageStats error: ${usageStatsResult.message}")
                ValidationResult(initialConfidence, shouldRetry = false)
            }
        }
    }

    /**
     * Starts background polling of UsageStatsManager.
     * This serves as both a validation source and a fallback if AccessibilityService fails.
     */
    private fun startUsageStatsPolling() {
        usageStatsPollingJob?.cancel()
        usageStatsPollingJob = scope.launch {
            while (isActive) {
                delay(USAGE_STATS_POLL_INTERVAL_MS)

                val result = getForegroundAppReliable(context)
                when (result) {
                    is ForegroundAppResult.Success -> {
                        val newApp = result.packageName
                        val previousApp = _usageStatsDetectedApp.value

                        if (newApp != previousApp) {
                            _usageStatsDetectedApp.value = newApp
                            Log.v(TAG, "UsageStats detected app change: $previousApp -> $newApp")

                            // In fallback mode, emit detections directly
                            if (_detectionMode.value == DetectionMode.USAGE_STATS_FALLBACK) {
                                emitFallbackDetection(newApp)
                            }
                            // In hybrid mode, check if AccessibilityService missed this
                            else {
                                checkForMissedDetection(newApp)
                            }
                        }
                    }
                    is ForegroundAppResult.Stale -> {
                        // Data is stale, but record the package anyway for reference
                        _usageStatsDetectedApp.value = result.packageName
                    }
                    else -> {
                        // Error or no detection - leave as is
                    }
                }
            }
        }
    }

    /**
     * Checks if AccessibilityService missed a detection that UsageStatsManager caught.
     * For blocked apps, emits a fallback detection to ensure intervention triggers
     * even for apps with long loading screens (OpenGL/Vulkan games) that don't
     * generate accessibility events.
     */
    private suspend fun checkForMissedDetection(usageStatsApp: String) {
        val accessibilityApp = _accessibilityDetectedApp.value?.packageName
        val timeSinceAccessibilityEvent = healthMonitor.timeSinceLastEvent()

        // If AccessibilityService hasn't detected this app and hasn't had an event recently,
        // it might have missed something (e.g., slow-loading app with splash screen)
        if (accessibilityApp != usageStatsApp && timeSinceAccessibilityEvent > MISSED_DETECTION_THRESHOLD_MS) {
            Log.w(TAG, "Possible missed detection: UsageStats=$usageStatsApp, A11y=$accessibilityApp, " +
                    "time since A11y event=${timeSinceAccessibilityEvent}ms")

            // Only emit fallback detection for BLOCKED apps to avoid false positives
            val isBlocked = isBlockedAppCallback?.invoke(usageStatsApp) ?: false
            if (isBlocked) {
                Log.i(TAG, "Emitting fallback detection for blocked app: $usageStatsApp")
                emitFallbackDetection(usageStatsApp)
            } else {
                Log.d(TAG, "Skipping fallback detection for non-blocked app: $usageStatsApp")
            }
        }
    }

    /**
     * Emits a detection from the fallback (UsageStats-only) mode.
     */
    private suspend fun emitFallbackDetection(packageName: String) {
        val confidence = DetectionConfidence.usageStatsOnly()
        Log.i(TAG, "Fallback detection: $packageName (${confidence.overall})")
        emitValidatedDetection(packageName, confidence, validated = false)
    }

    private suspend fun emitValidatedDetection(
        packageName: String,
        confidence: DetectionConfidence,
        validated: Boolean
    ) {
        _validatedDetections.emit(
            ValidatedDetection(
                packageName = packageName,
                confidence = confidence,
                timestamp = System.currentTimeMillis(),
                wasValidated = validated,
                mode = _detectionMode.value
            )
        )
    }

    private fun logDiscrepancy(accessibilityApp: String, usageStatsApp: String) {
        val discrepancy = DetectionDiscrepancy(
            timestamp = System.currentTimeMillis(),
            accessibilityApp = accessibilityApp,
            usageStatsApp = usageStatsApp
        )
        detectionDiscrepancies.add(discrepancy)

        // Keep only recent discrepancies
        while (detectionDiscrepancies.size > DISCREPANCY_LOG_SIZE) {
            detectionDiscrepancies.removeAt(0)
        }

        Log.w(TAG, "Detection discrepancy: A11y=$accessibilityApp, UsageStats=$usageStatsApp")
    }

    /**
     * Returns recent detection discrepancies for debugging.
     */
    fun getRecentDiscrepancies(): List<DetectionDiscrepancy> {
        return detectionDiscrepancies.toList()
    }

    /**
     * Returns the current detection statistics.
     */
    fun getStats(): DetectionStats {
        return DetectionStats(
            mode = _detectionMode.value,
            healthStatus = healthMonitor.getHealthStatus(),
            recentDiscrepancies = detectionDiscrepancies.size,
            lastAccessibilityEvent = _accessibilityDetectedApp.value,
            lastUsageStatsApp = _usageStatsDetectedApp.value
        )
    }
}

/**
 * Represents a detection event from AccessibilityService
 */
data class AppDetectionEvent(
    val packageName: String,
    val timestamp: Long,
    val source: DetectionSource,
    val pattern: String = ""
)

/**
 * A validated detection ready to be acted upon
 */
data class ValidatedDetection(
    val packageName: String,
    val confidence: DetectionConfidence,
    val timestamp: Long,
    val wasValidated: Boolean,
    val mode: DetectionMode
)

/**
 * Detection source for events
 */
enum class DetectionSource {
    ACCESSIBILITY_SERVICE,
    USAGE_STATS_MANAGER,
    HYBRID_VALIDATED
}

/**
 * Current detection mode
 */
enum class DetectionMode {
    /**
     * Both AccessibilityService and UsageStatsManager are working
     */
    HYBRID,

    /**
     * AccessibilityService failed, using only UsageStatsManager
     */
    USAGE_STATS_FALLBACK
}

/**
 * Records a discrepancy between detection sources
 */
data class DetectionDiscrepancy(
    val timestamp: Long,
    val accessibilityApp: String,
    val usageStatsApp: String
)

/**
 * Statistics about detection performance
 */
data class DetectionStats(
    val mode: DetectionMode,
    val healthStatus: ServiceHealthMonitor.HealthStatus,
    val recentDiscrepancies: Int,
    val lastAccessibilityEvent: AppDetectionEvent?,
    val lastUsageStatsApp: String?
)

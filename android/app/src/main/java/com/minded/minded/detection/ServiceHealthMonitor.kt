package com.minded.minded.detection

import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Monitors the health of the AccessibilityService by tracking event reception.
 *
 * If the service stops receiving events for an extended period, it may indicate
 * the service has been killed by the system or is malfunctioning.
 */
class ServiceHealthMonitor {
    private val _isHealthy = MutableStateFlow(false)
    val isHealthy: StateFlow<Boolean> = _isHealthy.asStateFlow()

    private val _lastEventTime = MutableStateFlow(0L)
    val lastEventTime: StateFlow<Long> = _lastEventTime.asStateFlow()

    private var healthCheckJob: Job? = null
    private var scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private var onUnhealthyCallback: (() -> Unit)? = null

    companion object {
        private const val TAG = "ServiceHealthMonitor"
        private const val HEALTH_CHECK_INTERVAL_MS = 30_000L // 30 seconds
        private const val EVENT_TIMEOUT_MS = 60_000L // 1 minute without events = unhealthy
        private const val SEVERE_TIMEOUT_MS = 120_000L // 2 minutes = likely dead
    }

    /**
     * Starts monitoring service health.
     * Call this when the AccessibilityService connects.
     */
    fun startMonitoring() {
        Log.d(TAG, "Starting health monitoring")
        markHealthy()

        // Recreate scope if it was previously cancelled by cleanup()
        if (!scope.isActive) {
            scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
        }

        healthCheckJob?.cancel()
        healthCheckJob = scope.launch {
            while (isActive) {
                delay(HEALTH_CHECK_INTERVAL_MS)
                checkHealth()
            }
        }
    }

    /**
     * Stops health monitoring.
     * Call this when the AccessibilityService is destroyed.
     */
    fun stopMonitoring() {
        Log.d(TAG, "Stopping health monitoring")
        healthCheckJob?.cancel()
        healthCheckJob = null
    }

    /**
     * Records that an accessibility event was received.
     * Call this from onAccessibilityEvent().
     */
    fun recordEvent() {
        val now = System.currentTimeMillis()
        _lastEventTime.value = now

        if (!_isHealthy.value) {
            Log.i(TAG, "Service recovered - receiving events again")
            _isHealthy.value = true
        }
    }

    /**
     * Marks the service as healthy.
     * Call this when the service connects successfully.
     */
    fun markHealthy() {
        _lastEventTime.value = System.currentTimeMillis()
        _isHealthy.value = true
        Log.d(TAG, "Service marked as healthy")
    }

    /**
     * Marks the service as unhealthy.
     * Call this when a known issue is detected.
     */
    fun markUnhealthy(reason: String = "Unknown") {
        _isHealthy.value = false
        Log.w(TAG, "Service marked as unhealthy: $reason")
        onUnhealthyCallback?.invoke()
    }

    /**
     * Sets a callback to be invoked when the service becomes unhealthy.
     */
    fun setOnUnhealthyCallback(callback: () -> Unit) {
        onUnhealthyCallback = callback
    }

    /**
     * Returns true if the service has received an event within the specified time window.
     */
    fun receivedEventRecently(withinMs: Long): Boolean {
        return System.currentTimeMillis() - _lastEventTime.value < withinMs
    }

    /**
     * Returns the time since the last event in milliseconds.
     */
    fun timeSinceLastEvent(): Long {
        return System.currentTimeMillis() - _lastEventTime.value
    }

    /**
     * Returns the current health status with details.
     */
    fun getHealthStatus(): HealthStatus {
        val timeSinceLast = timeSinceLastEvent()
        return when {
            timeSinceLast < EVENT_TIMEOUT_MS -> HealthStatus.Healthy(timeSinceLast)
            timeSinceLast < SEVERE_TIMEOUT_MS -> HealthStatus.Warning(timeSinceLast)
            else -> HealthStatus.Critical(timeSinceLast)
        }
    }

    private fun checkHealth() {
        val timeSinceLastEvent = timeSinceLastEvent()

        when {
            timeSinceLastEvent > SEVERE_TIMEOUT_MS -> {
                Log.e(TAG, "CRITICAL: No events in ${timeSinceLastEvent}ms - service likely dead")
                if (_isHealthy.value) {
                    _isHealthy.value = false
                    onUnhealthyCallback?.invoke()
                }
            }
            timeSinceLastEvent > EVENT_TIMEOUT_MS -> {
                Log.w(TAG, "WARNING: No events in ${timeSinceLastEvent}ms - service may be unhealthy")
                if (_isHealthy.value) {
                    _isHealthy.value = false
                    onUnhealthyCallback?.invoke()
                }
            }
            else -> {
                Log.v(TAG, "Health check OK - last event ${timeSinceLastEvent}ms ago")
            }
        }
    }

    /**
     * Cleans up resources. Call when the service is destroyed.
     */
    fun cleanup() {
        healthCheckJob?.cancel()
        scope.cancel()
    }

    sealed class HealthStatus {
        abstract val timeSinceLastEventMs: Long

        data class Healthy(override val timeSinceLastEventMs: Long) : HealthStatus()
        data class Warning(override val timeSinceLastEventMs: Long) : HealthStatus()
        data class Critical(override val timeSinceLastEventMs: Long) : HealthStatus()
    }
}

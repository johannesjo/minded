package com.minded.minded.detection

import org.json.JSONObject

/**
 * Whether minded can currently see which app is in front - the fact the
 * dashboard needs in order to say, calmly, when it can't.
 *
 * Detection lives inside the accessibility service and dies with it (see
 * docs/sun-escalation-and-detection-reliability.md, "Accessibility optional").
 * The failure mode this exists for is the one the permission checks miss: the
 * service is still *enabled* in system settings, so no capability is reported
 * missing, but its binding is dead (an OEM battery manager killed it, or the
 * well-known post-update state where the toggle shows on but nothing runs
 * until it is switched off and on again). Then no intervention ever fires and
 * nothing tells the user - a local-only app has no other way to learn it has
 * gone quiet.
 *
 * Deliberately NOT based on "no accessibility events for N minutes": a phone
 * sitting idle produces no events either, and a wrong "minded isn't seeing
 * your apps" would break the 90%-sure bar for anything we say to the user.
 * A live binding is a fact; silence is not.
 */
data class DetectionHealth(
    /** The accessibility service is enabled in system settings. */
    val accessibilityEnabled: Boolean,
    /** The service is currently bound and connected (between onServiceConnected and onUnbind/onDestroy). */
    val serviceConnected: Boolean,
) {
    fun toJson(): String = JSONObject()
        .put("accessibilityEnabled", accessibilityEnabled)
        .put("serviceConnected", serviceConnected)
        .toString()
}

import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

/**
 * Re-evaluate the next sleep wind-down alarm after a cfg or state change.
 * If wind-down is disabled, this also dismisses any visible notification.
 * No-op on non-Android platforms.
 */
export const refreshSleepWindDownAlarms = (): void => {
  if (!IS_ANDROID) return;
  try {
    androidInterface.scheduleSleepWindDownAlarms?.();
  } catch (e) {
    console.warn("scheduleSleepWindDownAlarms failed", e);
  }
};

/**
 * Dismiss the wind-down notification if visible. Use on route entry, after
 * skip-for-tonight, and after snooze so the heads-up doesn't linger while
 * the user is already attending to the prompt.
 * No-op on non-Android platforms.
 */
export const dismissSleepWindDownNotification = (): void => {
  if (!IS_ANDROID) return;
  try {
    androidInterface.dismissSleepWindDownNotification?.();
  } catch (e) {
    console.warn("dismissSleepWindDownNotification failed", e);
  }
};

/** True if POST_NOTIFICATIONS is granted (or not required on this platform). */
export const hasNotificationPermission = (): boolean => {
  if (!IS_ANDROID) return true;
  try {
    return androidInterface.hasNotificationPermission?.() ?? true;
  } catch (e) {
    console.warn("hasNotificationPermission failed", e);
    return true;
  }
};

/**
 * Trigger the runtime POST_NOTIFICATIONS prompt if needed. Without this the
 * notification path is silently broken on Android 13+ — the system requires
 * an explicit grant. No-op on non-Android, on Android < 13, or if already
 * granted.
 */
export const ensureNotificationPermission = (): void => {
  if (!IS_ANDROID) return;
  try {
    if (androidInterface.hasNotificationPermission?.()) return;
    androidInterface.requestNotificationPermission?.();
  } catch (e) {
    console.warn("ensureNotificationPermission failed", e);
  }
};

import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";

/**
 * Re-evaluate the next sleep wind-down alarm after a cfg or state change.
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
 * Cancel the next sleep wind-down alarm and dismiss the notification if any.
 * No-op on non-Android platforms.
 */
export const cancelSleepWindDownAlarms = (): void => {
  if (!IS_ANDROID) return;
  try {
    androidInterface.cancelSleepWindDownAlarms?.();
  } catch (e) {
    console.warn("cancelSleepWindDownAlarms failed", e);
  }
};

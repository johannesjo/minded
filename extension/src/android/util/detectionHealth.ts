import { safeJsonParse } from "@src/util/safeJsonParse";

/**
 * Mirror of the native `DetectionHealth` (android/.../detection/DetectionHealth.kt).
 * Read on every dashboard refresh so the shell can say, calmly, when minded
 * can't see which app is in front.
 */
export interface DetectionHealth {
  accessibilityEnabled: boolean;
  serviceConnected: boolean;
}

// A missing or malformed read is treated as "watching": the line below may
// only ever appear on a *known* fact, never on a failed read.
const WATCHING: DetectionHealth = {
  accessibilityEnabled: true,
  serviceConnected: true,
};

export const parseDetectionHealth = (
  raw: string | null | undefined,
): DetectionHealth => {
  const parsed = safeJsonParse<Partial<DetectionHealth> | null>(
    raw ?? "",
    null,
  );
  if (
    !parsed ||
    typeof parsed.accessibilityEnabled !== "boolean" ||
    typeof parsed.serviceConnected !== "boolean"
  ) {
    return WATCHING;
  }
  return {
    accessibilityEnabled: parsed.accessibilityEnabled,
    serviceConnected: parsed.serviceConnected,
  };
};

/**
 * The one state worth a word: accessibility is switched on in system
 * settings (so the missing-permission banner stays quiet) but the service
 * isn't actually bound, so no intervention can fire. Accessibility being
 * *off* is the permission banner's job, not this one's - the two never show
 * together.
 */
export const isDetectionSilent = (health: DetectionHealth): boolean =>
  health.accessibilityEnabled && !health.serviceConnected;

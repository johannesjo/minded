import {
  IS_ANDROID,
  IS_APP,
  IS_IOS,
  IS_WEB_EXT,
} from "@src/dataInterface/commonSyncDataInterface";
import type { SessionPlatform } from "@src/dataInterface/syncData";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import type {
  AlternativeOpenCapabilities,
  AlternativeOpenTarget,
} from "@src/shared/components/interaction/alternatives/alternativeRedirect";

/**
 * The platform side of the alternative redirect (alternativeRedirect.ts holds
 * the pure decisions). Shared by the in-prompt offer (ShowAlternative) and the
 * post-sun choice (redirect/PostSunChoice), so both open things the same way.
 */

/** The platform an alternative is scoped to, as ShowAlternative reads it. */
export const getAlternativePlatform = (): SessionPlatform =>
  IS_APP ? (IS_IOS ? "ios" : "android") : "web";

export const getAlternativeOpenCapabilities =
  (): AlternativeOpenCapabilities => ({
    canOpenUrl: IS_WEB_EXT,
    canOpenApp: IS_ANDROID && !!androidInterface.openAppNamed,
  });

// Hand over to the alternative. False when nothing opened, so the caller
// falls back to the plain leave rather than stranding the user.
export const openAlternativeTarget = (
  target: AlternativeOpenTarget,
): boolean => {
  if (target.kind === "url") {
    // The redirect takes over this tab. The sky stays up until the page
    // unloads - fading it first would bare the very feed being left (and a
    // back-navigation would restore an invisible, click-eating overlay).
    window.location.href = target.href;
    return true;
  }

  try {
    // Native resolves and launches the app, then fades its window out.
    return androidInterface.openAppNamed?.(target.label) === true;
  } catch (error) {
    console.error("Failed to open alternative", error);
    return false;
  }
};

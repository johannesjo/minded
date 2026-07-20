import type { SunSettle } from "@src/shared/components/interaction/sun/Sun";
import { sunCompanionSettle } from "@src/shared/components/interaction/sun/sunSettle";

/** Small enough to stay quiet above the website picker, but still recognisable. */
export const WEB_ONBOARDING_SKY_SUN_SCALE = 0.38;

export interface WebOnboardingSunAnchors {
  heroYFromBottom: number | null;
  skyYFromBottom: number | null;
  companionYFromBottom: number | null;
}

/**
 * The three rests of the single web-onboarding sun: hero, setup sky, and the
 * dashboard companion anchor. All are centred and bottom-pinned so Sun can
 * glide between them without a per-step replacement.
 */
export const getWebOnboardingSunSettle = (
  step: number,
  isLeaving: boolean,
  anchors: WebOnboardingSunAnchors,
): SunSettle | null => {
  if (isLeaving) {
    return anchors.companionYFromBottom == null
      ? null
      : sunCompanionSettle(anchors.companionYFromBottom);
  }

  const wantsHero = step === 0 || step >= 2;
  if (wantsHero && anchors.heroYFromBottom != null) {
    return {
      anchorYPxFromBottom: anchors.heroYFromBottom,
      scale: 1,
      breathe: false,
    };
  }

  // The welcome waits for its real slot so the disc never flashes at centre.
  // The final beat can remain in the setup sky while its new slot mounts.
  if (step === 0) return null;

  return anchors.skyYFromBottom == null
    ? null
    : {
        anchorYPxFromBottom: anchors.skyYFromBottom,
        scale: WEB_ONBOARDING_SKY_SUN_SCALE,
        breathe: false,
      };
};

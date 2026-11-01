import type { SunSettle } from "@src/shared/components/interaction/sun/Sun";
import { sunCompanionSettle } from "@src/shared/components/interaction/sun/sunSettle";

/** Small enough to stay quiet above the website picker, but still recognisable. */
export const WEB_ONBOARDING_SKY_SUN_SCALE = 0.38;

export interface WebOnboardingSunAnchors {
  heroYFromBottom: number | null;
  skyYFromBottom: number | null;
  companionYFromBottom: number | null;
}

/** Where the web onboarding stands, as far as the sun's rest is concerned. */
export interface WebOnboardingSunState {
  step: number;
  isLeaving: boolean;
  /** The welcome's continue practice (time choice and its outcome) is open. */
  isPracticing: boolean;
}

/** The setup step: the website picker sits under the small sky sun. */
export const WEB_ONBOARDING_SITES_STEP = 1;

/**
 * The rests of the single web-onboarding sun: hero (welcome, final beat),
 * setup sky (the welcome's continue practice, website picker), and the
 * dashboard companion anchor. All are centred and bottom-pinned so Sun can
 * glide between them without a per-step replacement.
 */
export const getWebOnboardingSunSettle = (
  state: WebOnboardingSunState,
  anchors: WebOnboardingSunAnchors,
): SunSettle | null => {
  if (state.isLeaving) {
    return anchors.companionYFromBottom == null
      ? null
      : sunCompanionSettle(anchors.companionYFromBottom);
  }

  const wantsHero =
    state.step !== WEB_ONBOARDING_SITES_STEP && !state.isPracticing;
  if (wantsHero && anchors.heroYFromBottom != null) {
    return {
      anchorYPxFromBottom: anchors.heroYFromBottom,
      scale: 1,
      breathe: false,
    };
  }

  // The welcome waits for its real slot so the disc never flashes at centre.
  // The final beat can remain in the setup sky while its new slot mounts.
  if (wantsHero && state.step === 0) return null;

  return anchors.skyYFromBottom == null
    ? null
    : {
        anchorYPxFromBottom: anchors.skyYFromBottom,
        scale: WEB_ONBOARDING_SKY_SUN_SCALE,
        breathe: false,
      };
};

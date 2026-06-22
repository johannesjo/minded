import { Component } from "solid-js";
import Sun from "./Sun";
// @ts-ignore
import styles from "./OnboardingSun.module.scss";

/**
 * The real sun, embedded in the onboarding "Meet minded" step so the first
 * thing the user does is the core gesture itself — fling or drag it away —
 * instead of reading about it beside an emoji. This closes the jump from a
 * static illustration to the live physics disc they meet in interventions.
 *
 * Tapping is off on purpose: the 5-tap "skip" is an intervention mechanic, not
 * part of meeting the sun, and its indicator dots would only puzzle here. A
 * completed fling or drag fires `onDismissed` (the caller advances the step);
 * a drag that doesn't cross the threshold snaps back, so the user can keep
 * playing before they commit.
 */
export const OnboardingSun: Component<{ onDismissed: () => void }> = (
  props,
) => {
  return (
    <div class={styles.stage}>
      <Sun
        variant="sun"
        isTapEnabled={false}
        onSkip={props.onDismissed}
        onFlingAway={props.onDismissed}
        onDragComplete={props.onDismissed}
      />
    </div>
  );
};

export default OnboardingSun;

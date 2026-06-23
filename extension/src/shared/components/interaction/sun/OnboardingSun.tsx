import { Component } from "solid-js";
import Sun from "./Sun";
// @ts-ignore
import styles from "./OnboardingSun.module.scss";

/**
 * The real sun, embedded in onboarding so the user meets the live physics disc
 * they'll see in interventions instead of a static emoji. Used two ways:
 *
 * - Interactive (`onDismiss` set): the "Meet minded" step, where the first
 *   thing the user does is the core gesture itself — fling or drag it away. A
 *   completed fling or drag fires `onDismiss` (the caller advances the step); a
 *   drag that doesn't cross the threshold snaps back, so they can keep playing
 *   before they commit.
 * - Display (`onDismiss` omitted): the closing "sun is ready" step, where the
 *   same real disc just sits and glows. Dragging is disabled so a release
 *   always snaps back — it stays alive to nudge but can never be dismissed.
 *
 * Tapping is off in both: the 5-tap "skip" is an intervention mechanic, not
 * part of meeting the sun, and its indicator dots would only puzzle here.
 */
export const OnboardingSun: Component<{ onDismiss?: () => void }> = (props) => {
  const dismiss = () => props.onDismiss?.();
  return (
    <div class={styles.stage}>
      <Sun
        variant="sun"
        isTapEnabled={false}
        isDragEnabled={!!props.onDismiss}
        minimizeWillChange={true}
        onSkip={dismiss}
        onFlingAway={dismiss}
        onDragComplete={dismiss}
      />
    </div>
  );
};

export default OnboardingSun;

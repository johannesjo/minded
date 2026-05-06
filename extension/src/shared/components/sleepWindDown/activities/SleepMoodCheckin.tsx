import { createSignal, JSX } from "solid-js";
import TglBtns from "@src/shared/components/ui/TglBtns";
import { SleepMoodVal, SLEEP_MOOD_OPTIONS } from "./sleepMood.const";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

/**
 * Single-tap mood check-in for wind-down. Unlike the daytime MoodCheckin,
 * there is no follow-up — the goal at bedtime is disengagement, not
 * problem-solving.
 *
 * `hasPicked` blocks subsequent taps and disables pointer events on the
 * button row. Without the pointer-events block, `TglBtns` updates its
 * highlight before calling `onSelect`, so a fast second tap would visually
 * move the selection while the persisted value stayed at the first pick.
 * Resets on persist failure so a transient storage error doesn't lock the
 * user out of the view.
 */
export const SleepMoodCheckin = (props: {
  onSelect: (val: SleepMoodVal) => void | Promise<void>;
  onDone: () => void | Promise<void>;
}): JSX.Element => {
  const [hasPicked, setHasPicked] = createSignal(false);

  return (
    <div class={styles.activityBody}>
      <h2 class={`h2 ${styles.activityTitle}`}>How are you feeling?</h2>
      <p class={styles.subtle}>Just a quick read-out before sleep.</p>
      <div style={{ "pointer-events": hasPicked() ? "none" : "auto" }}>
        <TglBtns
          options={SLEEP_MOOD_OPTIONS}
          onSelect={async (val) => {
            if (hasPicked()) return;
            setHasPicked(true);
            try {
              await props.onSelect(val);
              await props.onDone();
            } catch (e) {
              setHasPicked(false);
              console.warn("Failed to persist sleep mood", e);
            }
          }}
        />
      </div>
    </div>
  );
};

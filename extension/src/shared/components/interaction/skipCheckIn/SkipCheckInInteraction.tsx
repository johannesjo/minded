import { createSignal, For, JSX, onCleanup } from "solid-js";
import Btn from "@src/shared/components/ui/Btn";
import {
  SKIP_CHECK_IN_ARM_MS,
  SKIP_CHECK_IN_CHOICES,
  SKIP_CHECK_IN_OBSERVATION,
  SKIP_CHECK_IN_QUESTION,
  type SkipCheckInChoice,
} from "@src/shared/components/interaction/skipCheckIn/skipCheckIn";
import styles from "./SkipCheckInInteraction.module.scss";

/**
 * Shown in place of the usual prompt once the pause has been passed straight
 * by enough times in a row (see skipCheckIn.ts). The sun can't be tapped past
 * here - these choices are the way in - but it can still be flung away to
 * leave, so this is a fork, never a wall.
 */
export const SkipCheckIn: (props: {
  onChoose: (choice: SkipCheckInChoice) => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getIsArmed, setIsArmed] = createSignal(false);
  const [getIsChosen, setIsChosen] = createSignal(false);

  const armTimeout = window.setTimeout(
    () => setIsArmed(true),
    SKIP_CHECK_IN_ARM_MS,
  );
  onCleanup(() => window.clearTimeout(armTimeout));

  const choose = (choice: SkipCheckInChoice) => {
    // Before arming a tap is most likely the tail of a reflexive triple-tap;
    // swallow it quietly rather than greying the choices out while they fade in.
    if (!getIsArmed() || getIsChosen()) return;
    setIsChosen(true);
    props.onCancelCountdown();
    props.onChoose(choice);
  };

  return (
    <div
      class={styles.SkipCheckIn}
      onMouseEnter={() => props.onCancelCountdown()}
    >
      <div class="txtBig interaction-heading">
        <div class="interaction-caption">{SKIP_CHECK_IN_OBSERVATION}</div>
        <div>{SKIP_CHECK_IN_QUESTION}</div>
      </div>

      <div class={styles.choices}>
        <For each={SKIP_CHECK_IN_CHOICES}>
          {(option) => (
            <Btn disabled={getIsChosen()} onClick={() => choose(option.choice)}>
              {option.label}
            </Btn>
          )}
        </For>
      </div>
    </div>
  );
};

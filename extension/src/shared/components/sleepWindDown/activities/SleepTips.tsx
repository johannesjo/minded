import { For, JSX } from "solid-js";
import { SLEEP_TIPS } from "@src/shared/data/sleepContent";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

export const SleepTips = (props: {
  onDone: () => void;
  onBack: () => void;
}): JSX.Element => {
  return (
    <div class={styles.activityBody}>
      <h3 class="h3" style={{ "text-align": "center", margin: 0 }}>
        Tips for good sleep
      </h3>
      <ul class={styles.tipsList}>
        <For each={SLEEP_TIPS}>{(tip) => <li>{tip}</li>}</For>
      </ul>
      <div class={styles.activityActions}>
        <button class="btnTxtOutline" onClick={props.onBack}>
          Back
        </button>
        <button class="btnTxt" onClick={props.onDone}>
          Done
        </button>
      </div>
    </div>
  );
};

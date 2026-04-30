import { JSX } from "solid-js";
import { CALM_READ_TEXT } from "@src/shared/data/sleepContent";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

export const CalmRead = (props: {
  onDone: () => void;
  onBack: () => void;
}): JSX.Element => {
  return (
    <div class={styles.activityBody}>
      <p class={styles.calmRead}>{CALM_READ_TEXT}</p>
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

import { JSX } from "solid-js";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

export const Goodnight = (props: { onDone: () => void }): JSX.Element => {
  return (
    <div class={styles.goodnight}>
      <div class={styles.sparkles} aria-hidden="true">
        ✦ ✧ ✦
      </div>
      <h2 class="h2" style={{ margin: 0 }}>
        Good night
      </h2>
      <p class={styles.subtle}>Breathe out slowly, and put the phone down.</p>
      <button class="btnTxtOutline" onClick={props.onDone}>
        Close
      </button>
    </div>
  );
};

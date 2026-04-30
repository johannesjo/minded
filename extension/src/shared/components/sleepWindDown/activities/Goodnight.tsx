import { JSX, onCleanup, onMount } from "solid-js";
// @ts-ignore
import styles from "../SleepWindDownRoute.module.scss";

const AUTO_DISMISS_MS = 8000;

export const Goodnight = (props: { onDone: () => void }): JSX.Element => {
  onMount(() => {
    const t = setTimeout(() => props.onDone(), AUTO_DISMISS_MS);
    onCleanup(() => clearTimeout(t));
  });

  return (
    <div class={styles.goodnight}>
      <div class={styles.sparkles} aria-hidden="true">
        ✦ ✧ ✦
      </div>
      <h2 class="h2" style={{ margin: 0 }}>
        Sleep well
      </h2>
      <p class={styles.subtle}>Breathe out slowly, and let the phone rest.</p>
    </div>
  );
};

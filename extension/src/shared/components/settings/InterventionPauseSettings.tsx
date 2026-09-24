import { createSignal, JSX, Show } from "solid-js";
import { clearInterventionPause } from "@src/dataInterface/commonSyncDataInterface";
import type { InterventionPause } from "@src/dataInterface/syncData";
import Btn from "@src/shared/components/ui/Btn";
import { fadeOut, PAGE_FADE_MS } from "@src/util/animation";
import styles from "./InterventionPauseSettings.module.scss";

const formatPauseEnd = (untilTS: number): string =>
  new Date(untilTS).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

export const describeInterventionPause = (pause: InterventionPause): string =>
  pause.kind === "off"
    ? `Paused until ${formatPauseEnd(pause.untilTS)}.`
    : `Until ${formatPauseEnd(pause.untilTS)}, the pause waits until you've stayed a while.`;

/**
 * The week chosen from the skip check-in, shown only while it stands: what it
 * is, when it ends, and the one way to end it early. When the week is over it
 * simply ends - nothing here asks again or welcomes the user back.
 */
export const InterventionPauseSettings = (props: {
  initialPause: InterventionPause;
}): JSX.Element => {
  const [getIsResuming, setIsResuming] = createSignal(false);
  const [getIsResumed, setIsResumed] = createSignal(false);
  let activeStateEl: HTMLDivElement | undefined;

  // Only confirm once the week is really gone; a failed write leaves the line
  // (and the button) as they were, so the page never claims what didn't happen.
  // The swap is soft both ways: the old line fades out, the new one fades in.
  const resume = async () => {
    if (getIsResuming()) return;
    setIsResuming(true);
    try {
      await clearInterventionPause();
      if (activeStateEl) await fadeOut(activeStateEl, PAGE_FADE_MS).promise;
      setIsResumed(true);
    } catch (error) {
      console.error("Failed to resume", error);
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <div class={styles.InterventionPauseSettings}>
      <Show
        when={getIsResumed()}
        fallback={
          <div class={styles.state} ref={activeStateEl}>
            <p class={styles.description}>
              {describeInterventionPause(props.initialPause)}
            </p>
            <Btn
              outline
              disabled={getIsResuming()}
              onClick={() => void resume()}
            >
              Resume now
            </Btn>
          </div>
        }
      >
        <p class={`${styles.description} ${styles.state}`}>
          Back to how it was.
        </p>
      </Show>
    </div>
  );
};

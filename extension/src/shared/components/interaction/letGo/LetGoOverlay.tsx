import { Component, createSignal, onCleanup } from "solid-js";
import styles from "./LetGoOverlay.module.scss";
import { Question } from "@src/shared/components/interaction/Question";
import { Answer } from "@src/dataInterface/syncData";
import Btn from "@src/shared/components/ui/Btn";
import {
  LET_GO_AUTO_DISMISS_MS,
  LET_GO_FADE_MS,
  LET_GO_QUESTION,
} from "@src/shared/components/interaction/letGo/letGo.const";

interface LetGoOverlayProps {
  /** Prior answers, so the standard Question can offer them as before. */
  answers: Answer[];
  /** Called once the flow is finished (answered, declined, or ignored). */
  onClose: () => void;
}

/**
 * The "let go" reflection the dashboard sun offers when flung *away* (up). The
 * sibling of the down-drag grounding offer: an invitation, never a trap —
 * declining is as easy as answering, and doing nothing dismisses it. It hosts
 * the standard intervention `Question` so it reads like any other prompt; the
 * full-screen layer also hides the just-flung shell sun gliding home behind it.
 */
export const LetGoOverlay: Component<LetGoOverlayProps> = (props) => {
  const [getIsClosing, setIsClosing] = createSignal(false);

  let closeTimeout: number | undefined;
  let dismissTimeout: number | undefined;
  let hasEngaged = false;
  let isDisposed = false;

  const close = () => {
    if (getIsClosing()) return;
    setIsClosing(true);
    if (dismissTimeout) window.clearTimeout(dismissTimeout);
    closeTimeout = window.setTimeout(() => {
      if (!isDisposed) props.onClose();
    }, LET_GO_FADE_MS);
  };

  // A gentle offer never nags: if it is left untouched it fades on its own.
  dismissTimeout = window.setTimeout(() => {
    if (!isDisposed && !hasEngaged) close();
  }, LET_GO_AUTO_DISMISS_MS);

  // The Question calls onCancelCountdown the moment the user reveals/touches the
  // input — reuse it to cancel the auto-dismiss so a half-written thought is
  // never snatched away mid-sentence.
  const onEngage = () => {
    hasEngaged = true;
    if (dismissTimeout) {
      window.clearTimeout(dismissTimeout);
      dismissTimeout = undefined;
    }
  };

  onCleanup(() => {
    isDisposed = true;
    if (closeTimeout) window.clearTimeout(closeTimeout);
    if (dismissTimeout) window.clearTimeout(dismissTimeout);
  });

  return (
    <div
      class={styles.letGo}
      classList={{
        [styles.isClosing]: getIsClosing(),
      }}
      style={{ "--let-go-fade-ms": `${LET_GO_FADE_MS}ms` }}
    >
      <div class={styles.panel}>
        <Question
          initialQuestion={LET_GO_QUESTION}
          answers={props.answers}
          onSuccess={close}
          onSkip={close}
          onCancelCountdown={onEngage}
          onUpdateQuestion={() => undefined}
        />
        <Btn onClick={close}>Not now</Btn>
      </div>
    </div>
  );
};

export default LetGoOverlay;

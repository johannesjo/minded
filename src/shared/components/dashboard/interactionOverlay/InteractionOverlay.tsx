import { JSX } from "solid-js";
// @ts-ignore
import { Question } from "@src/shared/components/interaction/Question";
// @ts-ignore
import { getSyncData } from "@dataInterface/android/syncDataInterface";
import { fadeOut } from "@src/util/animation";
// @ts-ignore
import styles from "./InteractionOverlay.module.scss";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";

export const InteractionOverlay: (props: {
  onHideInteraction: () => void;
}) => JSX.Element = (props) => {
  let wrapperEl;

  return (
    <div
      class={styles.interactionOverlay}
      id="minded-6622-coloured-wrapper-dynamic"
      ref={wrapperEl}
      onclick={async (ev) => {
        if (
          (ev.target as HTMLElement)?.id ===
          "minded-6622-coloured-wrapper-dynamic"
        ) {
          await fadeOut(wrapperEl, 150).promise;
          props.onHideInteraction();
        }
      }}
    >
      <div class={styles.interactionWrapper}>
        <InteractionCommon
          isReducedSuccessSun={true}
          questionForPrompt={undefined}
          isInitFadeout={false}
          wrapperEl={wrapperEl}
          onSuccessSunTap={() => props.onHideInteraction()}
          onAfterSuccessSunFadeout={() => props.onHideInteraction()}
          onAfterInteractionFadeout={() => props.onHideInteraction()}
          onSetAnswer={() => undefined}
          onUpdateQuestion={() => undefined}
          onModeSet={() => undefined}
          onSkip={() => props.onHideInteraction()}
        />
      </div>
    </div>
  );
};

export default InteractionOverlay;

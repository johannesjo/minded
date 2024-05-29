import { JSX } from "solid-js";
import { fadeOut } from "@src/util/animation";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "./InteractionOverlay.module.scss";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";

export const InteractionOverlay: (props: {
  onHideInteraction: () => void;
  onPossibleNewData: () => void;
}) => JSX.Element = (props) => {
  let wrapperEl;

  return (
    <div
      class={styles.interactionOverlay}
      id="minded-6622-coloured-wrapper"
      ref={wrapperEl}
      onclick={async (ev) => {
        if ((ev.target as HTMLElement)?.id === "minded-6622-coloured-wrapper") {
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
          onInteractionSubmitted={() => {
            props.onPossibleNewData();
          }}
          onSuccessSunTap={() => {
            props.onHideInteraction();
          }}
          onAfterSuccessSunFadeout={() => {
            props.onHideInteraction();
          }}
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

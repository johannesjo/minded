import { JSX, onMount } from "solid-js";
import { fadeOut } from "@src/util/animation";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "./InteractionOverlay.module.scss";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { ON_SHOW_INTERACTION_OVERLAY_EV } from "@src/ev.const";

export const InteractionOverlay: (props: {
  onHideInteraction: () => void;
  onPossibleNewData: () => void;
}) => JSX.Element = (props) => {
  let wrapperEl;

  onMount(() => {
    window.dispatchEvent(new Event(ON_SHOW_INTERACTION_OVERLAY_EV));
  });

  return (
    <div
      class={styles.interactionOverlay}
      id="minded-6622-coloured-wrapper"
      ref={wrapperEl}
      onclick={(ev) => {
        // Background click disabled - only gesture controls
        ev.stopPropagation();
      }}
    >
      <div class={styles.interactionWrapper}>
        <InteractionCommon
          questionForPrompt={undefined}
          isInitFadeout={false}
          wrapperEl={wrapperEl}
          onInteractionSubmitted={() => {
            props.onPossibleNewData();
          }}
          onAfterInteractionFadeout={() => props.onHideInteraction()}
          onSetAnswer={() => undefined}
          onUpdateQuestion={() => undefined}
          onModeSet={() => undefined}
          onSkip={() => props.onHideInteraction()}
          onSwipeDown={() => props.onHideInteraction()}
          onSwipeUp={() => props.onHideInteraction()}
          onProceedToApp={() => props.onHideInteraction()}
          enableGestures={true}
        />
      </div>
    </div>
  );
};

export default InteractionOverlay;

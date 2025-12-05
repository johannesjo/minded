import { JSX, onMount } from "solid-js";
import { fadeOut } from "@src/util/animation";
import styles from "./InteractionOverlay.module.scss";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { ON_SHOW_INTERACTION_OVERLAY_EV } from "@src/ev.const";

export const InteractionOverlay: (props: {
  onHideInteraction: () => void;
  onPossibleNewData: () => void;
}) => JSX.Element = (props) => {
  let wrapperEl: HTMLDivElement = undefined!;

  onMount(() => {
    window.dispatchEvent(new Event(ON_SHOW_INTERACTION_OVERLAY_EV));
  });

  const handleHideWithFade = () => {
    const { promise } = fadeOut(wrapperEl, 800); // 0.8 second fade
    promise.then(() => {
      props.onHideInteraction();
    });
  };

  return (
    <div
      class={styles.interactionOverlay}
      id="minded-6622-coloured-wrapper"
      ref={wrapperEl}
    >
      <div class={styles.interactionWrapper}>
        <InteractionCommon
          questionForPrompt={undefined}
          isInitFadeout={false}
          wrapperEl={wrapperEl!}
          isFromDashboard={true}
          onInteractionSubmitted={() => {
            props.onPossibleNewData();
          }}
          onAfterInteractionFadeout={() => props.onHideInteraction()}
          onSetAnswer={() => undefined}
          onUpdateQuestion={() => undefined}
          onModeSet={() => undefined}
          onSkip={handleHideWithFade}
          onFlingAway={handleHideWithFade}
          onDragComplete={handleHideWithFade}
        />
      </div>
    </div>
  );
};

export default InteractionOverlay;

import { JSX, onMount } from "solid-js";
import { fadeOut } from "@src/util/animation";
import styles from "./InteractionOverlay.module.scss";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { setSunRole } from "@src/shared/components/interaction/sun/sunStore";
import { ON_SHOW_INTERACTION_OVERLAY_EV } from "@src/ev.const";

export const InteractionOverlay: (props: {
  onHideInteraction: () => void;
  onPossibleNewData: () => void;
  /**
   * Open with no entrance fade. Used when launched from the home-screen sun
   * widget so we land straight in the interaction rather than fading the
   * dashboard out behind it.
   */
  instant?: boolean;
}) => JSX.Element = (props) => {
  let wrapperEl: HTMLDivElement = undefined!;

  onMount(() => {
    window.dispatchEvent(new Event(ON_SHOW_INTERACTION_OVERLAY_EV));
  });

  const handleHideWithFade = () => {
    // Send the shell sun (which lives above the overlay sky, z-30 over z-20)
    // gliding back to its companion rest *now*, so it travels home while the
    // sky fades out beneath it — instead of sitting still through the whole
    // fade and only starting to move once the overlay is gone.
    setSunRole("companion");
    const { promise } = fadeOut(wrapperEl, 800); // 0.8 second fade
    promise.then(() => {
      props.onPossibleNewData(); // Always refresh dashboard when closing
      props.onHideInteraction();
    });
  };

  return (
    <div
      class={styles.interactionOverlay}
      classList={{ [styles.instant]: props.instant }}
      id="minded-6622-coloured-wrapper"
      ref={wrapperEl}
    >
      <div class={styles.interactionWrapper}>
        <InteractionCommon
          questionForPrompt={undefined}
          isInitFadeout={false}
          wrapperEl={wrapperEl!}
          isFromDashboard={true}
          useShellSun={true}
          interactionPlatform="web"
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

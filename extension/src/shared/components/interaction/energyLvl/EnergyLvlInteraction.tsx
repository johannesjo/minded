/* @refresh reload */
import { JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
import { saveEnergyLvl } from "@src/dataInterface/commonSyncDataInterface";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import { voiceFollowStyle } from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

// once on app load

const ENERGY_QUESTION = "How would you rate your energy level today?";

export const EnergyLvlInteraction: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onRatingSelect = async (val: number) => {
    await saveEnergyLvl(val);
    props.onSuccess();
  };

  return (
    <div
      class="voice-follow-scope"
      style={voiceFollowStyle(ENERGY_QUESTION)}
      onmouseenter={props.onCancelCountdown}
    >
      <VoiceReveal
        class="txtBig"
        text={ENERGY_QUESTION}
        style={{ "padding-bottom": "32px" }}
      />
      <div class="voice-follow">
        <Rating onSetRating={onRatingSelect} anchors={["low", "high"]} />
      </div>
    </div>
  );
};

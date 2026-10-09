/* @refresh reload */
import { JSX } from "solid-js";
import {
  IS_APP,
  IS_WEB_EXT,
  saveReplacementStructuredAlternativeApp,
  saveReplacementStructuredAlternativeWebsite,
  saveStructuredAlternativeApp,
  saveStructuredAlternativeWebsite,
} from "@src/dataInterface/commonSyncDataInterface";
import type { Alternative } from "@src/dataInterface/syncData";
import { InputWithSend } from "@src/shared/components/ui/InputWithSend";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import { voiceFollowStyle } from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

// once on app load

const SET_ALTERNATIVE_QUESTION = IS_APP
  ? "What other app would be better to use instead of this one?"
  : "What website might be better to visit instead of this one?";

export const SetAlternativeInteraction: (props: {
  currentAlternative?: Alternative;
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSave = async (val: string) => {
    const alternative = val.trim();
    if (!alternative || alternative === "https://") {
      return;
    }

    if (IS_APP) {
      if (props.currentAlternative) {
        await saveReplacementStructuredAlternativeApp(
          props.currentAlternative,
          alternative,
        );
      } else {
        await saveStructuredAlternativeApp(alternative);
      }
    } else {
      if (props.currentAlternative) {
        await saveReplacementStructuredAlternativeWebsite(
          props.currentAlternative,
          alternative,
        );
      } else {
        await saveStructuredAlternativeWebsite(alternative);
      }
    }
    props.onSuccess();
  };

  return (
    <div
      class="voice-follow-scope"
      style={voiceFollowStyle(SET_ALTERNATIVE_QUESTION)}
      onmouseenter={props.onCancelCountdown}
    >
      <VoiceReveal class="txtBig" text={SET_ALTERNATIVE_QUESTION} />

      <div class="voice-follow">
        <InputWithSend
          isAutoFocus={true}
          type={IS_WEB_EXT ? "url" : "text"}
          onCancelCountdown={props.onCancelCountdown}
          maxLength={500}
          onSubmit={onSave}
        />
      </div>
    </div>
  );
};

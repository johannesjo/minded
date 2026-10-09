import { Component, For } from "solid-js";
import { SessionIntent } from "@src/dataInterface/syncData";
import {
  getSessionIntentLabel,
  SESSION_INTENT_OPTIONS,
} from "@src/shared/components/interaction/intentSelection/sessionIntent.const";
import Btn from "@src/shared/components/ui/Btn";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import {
  VOICE_REVEAL,
  voiceFollowStyle,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

export interface IntentSelectionProps {
  onSelectIntent: (intent: SessionIntent | undefined) => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
  isArmed: boolean;
}

const INTENT_QUESTION = "What do you want to do here?";

export const IntentSelection: Component<IntentSelectionProps> = (props) => {
  const handleSelect = (intent: SessionIntent | undefined) => {
    if (!props.isArmed) {
      return;
    }

    props.onCancelCountdown();
    props.onSelectIntent(intent);
  };

  const handleCancel = () => {
    props.onCancelCountdown();
    props.onCancel();
  };

  return (
    <div
      class="intent-selection-wrapper voice-follow-scope"
      // The choices mount as the sun glides down to rest beneath them: let it
      // land before the question is spoken. The scope is the wrapper so the
      // cancel follows the sentence too - chrome never arrives before the voice.
      style={voiceFollowStyle(INTENT_QUESTION, VOICE_REVEAL.SUN_GLIDE_LEAD_MS)}
    >
      <div
        class="intent-selection-container"
        classList={{ "is-arming": !props.isArmed }}
      >
        <VoiceReveal
          class="txtBig"
          text={INTENT_QUESTION}
          lead={VOICE_REVEAL.SUN_GLIDE_LEAD_MS}
        />

        <div class="intent-options-grid voice-follow">
          <For each={SESSION_INTENT_OPTIONS}>
            {(intent) => (
              <Btn
                plain
                class="intent-option"
                disabled={!props.isArmed}
                onClick={() => handleSelect(intent)}
              >
                {getSessionIntentLabel(intent)}
              </Btn>
            )}
          </For>
          <Btn
            plain
            class="intent-option"
            disabled={!props.isArmed}
            onClick={() => handleSelect(undefined)}
          >
            other
          </Btn>
        </div>

        {/* Reserves the resting sun's footprint beneath the options so the disc
            sits inside the centred choices group (see measureRestingSunAnchor).
            Collapsed to 0 height outside the intervention overlay. */}
        <div class="resting-sun-spacer" aria-hidden="true" />
      </div>

      <div class="intent-selection-cancel voice-follow">
        <Btn soft onClick={handleCancel}>
          cancel
        </Btn>
      </div>
    </div>
  );
};

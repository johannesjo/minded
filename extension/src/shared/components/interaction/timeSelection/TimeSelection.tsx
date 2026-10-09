import { Component, For } from "solid-js";
import { SessionIntent } from "@src/dataInterface/syncData";
import { getSessionIntentTimeQuestion } from "@src/shared/components/interaction/intentSelection/sessionIntent.const";
import { getTimeOptions } from "@src/shared/components/interaction/timeSelection/timeSelectionOptions";
import Btn from "@src/shared/components/ui/Btn";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import {
  VOICE_REVEAL,
  voiceFollowStyle,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

interface TimeSelectionProps {
  onSelectTime: (seconds: number) => void;
  onCancel: () => void;
  intent?: SessionIntent;
  isArmed: boolean;
  /**
   * The sun is still gliding down to rest beneath the choices as they mount
   * (shown straight after the sun tap, when no intent is asked). False after
   * the intent step, where the sun is already resting - no reason to hold the
   * question back there.
   */
  isSunGliding?: boolean;
}

export const TimeSelection: Component<TimeSelectionProps> = (props) => {
  // Read the hour when the choices mount (the moment the user reaches this
  // step): in the deep-night window "rest of day" is dropped, since granting
  // screen time until midnight contradicts letting the day go.
  const options = getTimeOptions(new Date().getHours());

  const sunLead = (): number =>
    props.isSunGliding ? VOICE_REVEAL.SUN_GLIDE_LEAD_MS : 0;

  const handleSelect = (seconds: number) => {
    if (!props.isArmed) {
      return;
    }

    props.onSelectTime(seconds);
  };

  return (
    <div
      class="time-selection-wrapper voice-follow-scope"
      // When the choices mount as the sun glides down to rest beneath them, let
      // it land before the question is spoken. The scope is the wrapper so the
      // cancel follows the sentence too.
      style={voiceFollowStyle(
        getSessionIntentTimeQuestion(props.intent),
        sunLead(),
      )}
    >
      <div
        class="time-selection-container"
        classList={{ "is-arming": !props.isArmed }}
      >
        <VoiceReveal
          class="txtBig"
          text={getSessionIntentTimeQuestion(props.intent)}
          lead={sunLead()}
        />

        <div class="time-options-grid voice-follow">
          <For each={options}>
            {(option) => (
              <Btn
                plain
                class="time-option"
                disabled={!props.isArmed}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </Btn>
            )}
          </For>
        </div>

        {/* Reserves the resting sun's footprint beneath the options so the disc
            sits inside the centred choices group (see measureRestingSunAnchor).
            Collapsed to 0 height outside the intervention overlay. */}
        <div class="resting-sun-spacer" aria-hidden="true" />
      </div>

      <div class="time-selection-cancel voice-follow">
        <Btn soft onClick={props.onCancel}>
          cancel
        </Btn>
      </div>
    </div>
  );
};

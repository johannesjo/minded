import { Component, For } from "solid-js";
import { SessionIntent } from "@src/dataInterface/syncData";
import {
  getSessionIntentLabel,
  SESSION_INTENT_OPTIONS,
} from "@src/shared/components/interaction/intentSelection/sessionIntent.const";
import Btn from "@src/shared/components/ui/Btn";

export interface IntentSelectionProps {
  onSelectIntent: (intent: SessionIntent | undefined) => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
  isArmed: boolean;
}

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
    <div class="intent-selection-wrapper">
      <div
        class="intent-selection-container"
        classList={{ "is-arming": !props.isArmed }}
      >
        <div class="txtBig">What do you want to do here?</div>

        <div class="intent-options-grid">
          <For each={SESSION_INTENT_OPTIONS}>
            {(intent) => (
              <Btn
                variant="toggle"
                disabled={!props.isArmed}
                onClick={() => handleSelect(intent)}
              >
                {getSessionIntentLabel(intent)}
              </Btn>
            )}
          </For>
        </div>

        <Btn
          variant="toggle"
          disabled={!props.isArmed}
          onClick={() => handleSelect(undefined)}
        >
          other
        </Btn>

        {/* Reserves the resting sun's footprint beneath the options so the disc
            sits inside the centred choices group (see measureRestingSunAnchor).
            Collapsed to 0 height outside the intervention overlay. */}
        <div class="resting-sun-spacer" aria-hidden="true" />
      </div>

      <div class="intent-selection-cancel">
        <Btn soft onClick={handleCancel}>
          cancel
        </Btn>
      </div>
    </div>
  );
};

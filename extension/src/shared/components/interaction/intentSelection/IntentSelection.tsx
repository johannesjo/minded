import { Component, For } from "solid-js";
import { SessionIntent } from "@src/dataInterface/syncData";
import {
  getSessionIntentLabel,
  SESSION_INTENT_OPTIONS,
} from "@src/shared/components/interaction/intentSelection/sessionIntent.const";

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
      <div class="intent-selection-container">
        <div class="txtBig">What do you want to do here?</div>

        <div class="intent-options-grid">
          <For each={SESSION_INTENT_OPTIONS}>
            {(intent) => (
              <button
                type="button"
                class="btnToggleSelect"
                disabled={!props.isArmed}
                onClick={() => handleSelect(intent)}
              >
                {getSessionIntentLabel(intent)}
              </button>
            )}
          </For>
        </div>

        <button
          type="button"
          class="btnTxt intent-selection-secondary"
          disabled={!props.isArmed}
          onClick={() => handleSelect(undefined)}
        >
          Continue without choosing
        </button>
      </div>

      <div class="intent-selection-cancel">
        <button type="button" class="btnTxt" onClick={handleCancel}>
          cancel
        </button>
      </div>
    </div>
  );
};

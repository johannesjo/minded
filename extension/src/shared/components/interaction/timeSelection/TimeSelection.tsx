import { Component, For } from "solid-js";
import { SessionIntent } from "@src/dataInterface/syncData";
import { getSessionIntentTimeQuestion } from "@src/shared/components/interaction/intentSelection/sessionIntent.const";

interface TimeSelectionProps {
  onSelectTime: (seconds: number) => void;
  onCancel: () => void;
  intent?: SessionIntent;
  isArmed: boolean;
}

export const TimeSelection: Component<TimeSelectionProps> = (props) => {
  const options = [
    { label: "1 min", value: 60 },
    { label: "5 min", value: 300 },
    { label: "15 min", value: 900 },
    { label: "30 min", value: 1800 },
    { label: "1 hour", value: 3600 },
    { label: "rest of day", value: -1 },
  ];

  const handleSelect = (seconds: number) => {
    if (!props.isArmed) {
      return;
    }

    props.onSelectTime(seconds);
  };

  return (
    <div class="time-selection-wrapper">
      <div
        class="time-selection-container"
        classList={{ "is-arming": !props.isArmed }}
      >
        <div class="txtBig">{getSessionIntentTimeQuestion(props.intent)}</div>

        <div class="time-options-grid">
          <For each={options}>
            {(option) => (
              <button
                type="button"
                class="btnToggleSelect"
                disabled={!props.isArmed}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="time-selection-cancel">
        <button type="button" class="btnTxt" onClick={props.onCancel}>
          cancel
        </button>
      </div>
    </div>
  );
};

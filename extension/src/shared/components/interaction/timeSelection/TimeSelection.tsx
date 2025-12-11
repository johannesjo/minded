import { Component, For } from "solid-js";
import "./TimeSelection.scss";

interface TimeSelectionProps {
  onSelectTime: (seconds: number) => void;
  onCancel: () => void;
}

export const TimeSelection: Component<TimeSelectionProps> = (props) => {
  const options = [
    { label: "1 min", value: 60 },
    { label: "5 min", value: 300 },
    { label: "15 min", value: 900 },
    { label: "rest of day", value: -1 },
  ];

  return (
    <div class="time-selection-wrapper">
      <div class="time-selection-container">
        <div class="txtBig">How long do you need?</div>

        <div class="time-options-grid">
          <For each={options}>
            {(option) => (
              <div
                class="btnToggleSelect"
                onClick={() => props.onSelectTime(option.value)}
              >
                {option.label}
              </div>
            )}
          </For>
        </div>
      </div>

      <div class="time-selection-cancel">
        <button class="btnTxt" onClick={props.onCancel}>
          cancel
        </button>
      </div>
    </div>
  );
};

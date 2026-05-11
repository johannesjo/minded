import { Component, For } from "solid-js";

interface TimeSelectionProps {
  onSelectTime: (seconds: number) => void;
  onCancel: () => void;
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

  return (
    <div class="time-selection-wrapper">
      <div class="time-selection-container">
        <div class="txtBig">How long do you intend to use the app?</div>

        <div class="time-options-grid">
          <For each={options}>
            {(option) => (
              <button
                type="button"
                class="btnToggleSelect"
                onClick={() => props.onSelectTime(option.value)}
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

import { Component } from "solid-js";
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
    { label: "Rest of Day", value: -1 }, // -1 indicates rest of day
  ];

  return (
    <div class="time-selection-container">
      <div class="time-selection-header">
        <h3>How long do you need?</h3>
      </div>
      <div class="time-options-grid">
        {options.map((option) => (
          <button
            class="time-option-btn"
            onClick={() => props.onSelectTime(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button class="cancel-btn" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  );
};

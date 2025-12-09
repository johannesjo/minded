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
    <div
      class="time-selection-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        "max-width": "420px",
        color: "#fff",
      }}
    >
      <div
        class="time-selection-header"
        style={{ margin: "0 auto 24px", "text-align": "center" }}
      >
        <h3 style={{ margin: 0, "font-size": "22px", "font-weight": 600 }}>
          How long do you need?
        </h3>
      </div>
      <div class="time-options-grid">
        {options.map((option) => (
          <button
            class="time-option-btn"
            style={{
              color: "#fff",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              "border-radius": "12px",
              padding: "16px",
              "font-size": "16px",
            }}
            onClick={() => props.onSelectTime(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button
        class="cancel-btn"
        style={{
          color: "rgba(255,255,255,0.7)",
          background: "transparent",
          border: "none",
          "font-size": "15px",
          padding: "12px 16px",
        }}
        onClick={props.onCancel}
      >
        Cancel
      </button>
    </div>
  );
};

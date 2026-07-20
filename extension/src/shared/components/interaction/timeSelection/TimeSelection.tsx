import { Component, For } from "solid-js";
import { SessionIntent } from "@src/dataInterface/syncData";
import { getSessionIntentTimeQuestion } from "@src/shared/components/interaction/intentSelection/sessionIntent.const";
import Btn from "@src/shared/components/ui/Btn";

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

      <div class="time-selection-cancel">
        <Btn soft onClick={props.onCancel}>
          cancel
        </Btn>
      </div>
    </div>
  );
};

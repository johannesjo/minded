import { createSignal, For, JSX, onMount } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_FOCUS_SCHEDULE } from "@src/dataInterface/syncData.const";
import { FocusSchedule as FocusScheduleType } from "@src/dataInterface/syncData";
import { Ico } from "@src/shared/components/ui/Ico";
import { Toggle } from "@src/shared/components/ui/Toggle";
import { Checkbox } from "@src/shared/components/ui/Checkbox";
import { TimeInput } from "@src/shared/components/ui/TimeInput";
// @ts-ignore
import styles from "./FocusSchedule.module.scss";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const FocusSchedule = (props: {
  onAfterSave?: () => void;
  showSaveButton?: boolean;
  onChange?: (schedule: FocusScheduleType) => void;
}): JSX.Element => {
  const [schedule, setSchedule] = createSignal<FocusScheduleType>(
    DEFAULT_FOCUS_SCHEDULE,
  );

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.cfg.focusSchedule) {
        setSchedule(syncData.cfg.focusSchedule);
      }
    });
  });

  const autoSave = async (newSchedule: FocusScheduleType) => {
    if (props.showSaveButton === false) {
      await updateUserCfg({ focusSchedule: newSchedule });
      props.onAfterSave?.();
    }
  };

  const toggleEnabled = () => {
    setSchedule((prev) => {
      const newSchedule = { ...prev, enabled: !prev.enabled };
      props.onChange?.(newSchedule);
      autoSave(newSchedule);
      return newSchedule;
    });
  };

  const toggleDay = (dayIndex: number) => {
    setSchedule((prev) => {
      const currentDay = prev.days[dayIndex];
      const newDays = { ...prev.days };

      if (currentDay === null || currentDay === undefined) {
        newDays[dayIndex] = { start: "09:00", end: "17:00" };
      } else {
        newDays[dayIndex] = null;
      }

      const newSchedule = { ...prev, days: newDays };
      props.onChange?.(newSchedule);
      autoSave(newSchedule);
      return newSchedule;
    });
  };

  const updateDayTime = (
    dayIndex: number,
    field: "start" | "end",
    value: string,
  ) => {
    setSchedule((prev) => {
      const currentDay = prev.days[dayIndex];
      if (!currentDay) return prev;

      const newDays = { ...prev.days };
      newDays[dayIndex] = { ...currentDay, [field]: value };

      const newSchedule = { ...prev, days: newDays };
      props.onChange?.(newSchedule);
      autoSave(newSchedule);
      return newSchedule;
    });
  };

  const saveAndContinue = async () => {
    await updateUserCfg({ focusSchedule: schedule() });
    props.onAfterSave?.();
  };

  const isDayEnabled = (dayIndex: number): boolean => {
    const day = schedule().days[dayIndex];
    return day !== null && day !== undefined;
  };

  const getDaySchedule = (dayIndex: number) => {
    return schedule().days[dayIndex] || { start: "09:00", end: "17:00" };
  };

  return (
    <div class={styles.FocusSchedule}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          When to Block
        </h3>
        <Toggle
          checked={schedule().enabled}
          onChange={toggleEnabled}
          label={schedule().enabled ? "Enabled" : "Disabled"}
        />
      </div>

      <p class={styles.description}>
        {schedule().enabled
          ? "Blocking is active only during the hours set below."
          : "Blocking is always active. Enable schedule to set focus hours."}
      </p>

      <div class={styles.daysList}>
        <For each={DAY_NAMES}>
          {(dayName, index) => (
            <div
              class={`${styles.dayRow} ${!schedule().enabled ? styles.isDisabled : ""}`}
            >
              <Checkbox
                checked={isDayEnabled(index())}
                onChange={() => toggleDay(index())}
                disabled={!schedule().enabled}
              />
              <span
                class={styles.dayName}
                onClick={() => schedule().enabled && toggleDay(index())}
              >
                {dayName}
              </span>
              <div class={styles.timeInputs}>
                <TimeInput
                  value={getDaySchedule(index()).start}
                  onChange={(value) => updateDayTime(index(), "start", value)}
                  disabled={!schedule().enabled || !isDayEnabled(index())}
                />
                <span class={styles.timeSeparator}>to</span>
                <TimeInput
                  value={getDaySchedule(index()).end}
                  onChange={(value) => updateDayTime(index(), "end", value)}
                  disabled={!schedule().enabled || !isDayEnabled(index())}
                />
              </div>
            </div>
          )}
        </For>
      </div>

      {props.showSaveButton !== false && (
        <div class={styles.controls}>
          <button class="btnTxt" onClick={saveAndContinue}>
            <Ico name="send" /> Save
          </button>
        </div>
      )}
    </div>
  );
};

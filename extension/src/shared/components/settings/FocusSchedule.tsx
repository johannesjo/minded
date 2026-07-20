import { createSignal, JSX, onMount, Show } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_FOCUS_SCHEDULE } from "@src/dataInterface/syncData.const";
import { FocusSchedule as FocusScheduleType } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import {
  DaysMap,
  WeekdaySchedule,
} from "@src/shared/components/settings/WeekdaySchedule";
// @ts-ignore
import styles from "./FocusSchedule.module.scss";

const DEFAULT_RANGE = { start: "09:00", end: "17:00" };

export const FocusSchedule = (
  props: { initialSchedule?: FocusScheduleType } = {},
): JSX.Element => {
  const hasInitialValue = "initialSchedule" in props;
  const [schedule, setSchedule] = createSignal<FocusScheduleType>(
    props.initialSchedule ?? DEFAULT_FOCUS_SCHEDULE,
  );
  const [loaded, setLoaded] = createSignal(hasInitialValue);

  onMount(() => {
    if (hasInitialValue) return;

    getSyncData().then((syncData) => {
      if (syncData.cfg.focusSchedule) {
        setSchedule(syncData.cfg.focusSchedule);
      }
      setLoaded(true);
    });
  });

  const autoSave = async (newSchedule: FocusScheduleType) => {
    await updateUserCfg({ focusSchedule: newSchedule });
  };

  const toggleEnabled = () => {
    setSchedule((prev) => {
      const newSchedule = { ...prev, enabled: !prev.enabled };
      autoSave(newSchedule);
      return newSchedule;
    });
  };

  const setDays = (days: DaysMap) => {
    setSchedule((prev) => {
      const newSchedule = { ...prev, days };
      autoSave(newSchedule);
      return newSchedule;
    });
  };

  return (
    <div class={styles.FocusSchedule}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Active hours
        </h3>
        <Toggle
          checked={schedule().enabled}
          onChange={toggleEnabled}
          label={schedule().enabled ? "On" : "Off"}
        />
      </div>

      {/* "appears/rests" rather than block-list vocabulary: the outward frame
          is an invitation ("where the sun meets you"), never a wall. */}
      <p class={styles.description}>
        {schedule().enabled
          ? "minded appears only during these hours. Outside them, it rests."
          : "minded appears around the clock. Enable to keep it to set hours."}
      </p>

      <Show when={loaded()}>
        <WeekdaySchedule
          days={schedule().days}
          onChange={setDays}
          disabled={!schedule().enabled}
          defaultRange={DEFAULT_RANGE}
        />
      </Show>
    </div>
  );
};

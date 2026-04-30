import { createSignal, For, JSX, onMount } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import { SleepWindDownCfg } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import { Checkbox } from "@src/shared/components/ui/Checkbox";
import { TimeInput } from "@src/shared/components/ui/TimeInput";
import { DEFAULT_DAY_RANGE } from "@src/shared/components/sleepWindDown/sleepWindDown.util";
// @ts-ignore — reuse FocusSchedule's layout styles
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

export const SleepWindDownSettings = (props: {
  onChange?: (cfg: SleepWindDownCfg) => void;
  showSaveButton?: boolean;
}): JSX.Element => {
  const [cfg, setCfg] = createSignal<SleepWindDownCfg>(DEFAULT_SLEEP_WIND_DOWN);

  onMount(() => {
    getSyncData().then((sd) => {
      if (sd.cfg.sleepWindDown) setCfg(sd.cfg.sleepWindDown);
    });
  });

  const autoSave = async (next: SleepWindDownCfg) => {
    if (props.showSaveButton === false) {
      await updateUserCfg({ sleepWindDown: next });
    }
  };

  const toggleEnabled = () => {
    setCfg((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      props.onChange?.(next);
      autoSave(next);
      return next;
    });
  };

  const toggleDay = (idx: number) => {
    setCfg((prev) => {
      const days = { ...prev.days };
      days[idx] = days[idx] ? null : { ...DEFAULT_DAY_RANGE };
      const next = { ...prev, days };
      props.onChange?.(next);
      autoSave(next);
      return next;
    });
  };

  const updateTime = (idx: number, field: "start" | "end", value: string) => {
    setCfg((prev) => {
      const cur = prev.days[idx];
      if (!cur) return prev;
      const days = { ...prev.days, [idx]: { ...cur, [field]: value } };
      const next = { ...prev, days };
      props.onChange?.(next);
      autoSave(next);
      return next;
    });
  };

  const isDayEnabled = (idx: number) => !!cfg().days[idx];
  const getRange = (idx: number) => cfg().days[idx] || DEFAULT_DAY_RANGE;

  return (
    <div class={styles.FocusSchedule}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Sleep Wind-Down
        </h3>
        <Toggle
          checked={cfg().enabled}
          onChange={toggleEnabled}
          label={cfg().enabled ? "Enabled" : "Disabled"}
        />
      </div>
      <p class={styles.description}>
        {cfg().enabled
          ? "When you unlock the phone during these hours, minded will offer a wind-down."
          : "Enable to be gently prompted to wind down at bedtime."}
      </p>
      <div class={styles.daysList}>
        <For each={DAY_NAMES}>
          {(name, index) => (
            <div
              class={`${styles.dayRow} ${!cfg().enabled ? styles.isDisabled : ""}`}
            >
              <Checkbox
                checked={isDayEnabled(index())}
                onChange={() => toggleDay(index())}
                disabled={!cfg().enabled}
              />
              <span
                class={styles.dayName}
                onClick={() => cfg().enabled && toggleDay(index())}
              >
                {name}
              </span>
              <div class={styles.timeInputs}>
                <TimeInput
                  value={getRange(index()).start}
                  onChange={(v) => updateTime(index(), "start", v)}
                  disabled={!cfg().enabled || !isDayEnabled(index())}
                />
                <span class={styles.timeSeparator}>to</span>
                <TimeInput
                  value={getRange(index()).end}
                  onChange={(v) => updateTime(index(), "end", v)}
                  disabled={!cfg().enabled || !isDayEnabled(index())}
                />
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

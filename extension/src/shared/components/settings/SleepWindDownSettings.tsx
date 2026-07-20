import { createSignal, JSX, onMount, Show } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import { SleepWindDownCfg } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import { DEFAULT_DAY_RANGE } from "@src/shared/components/sleepWindDown/sleepWindDown.util";
import {
  DaysMap,
  WeekdaySchedule,
} from "@src/shared/components/settings/WeekdaySchedule";
// @ts-ignore - reuse FocusSchedule's layout styles
import styles from "./FocusSchedule.module.scss";

export const SleepWindDownSettings = (props: {
  /** If true, persist each edit immediately. */
  autoSave?: boolean;
  initialCfg?: SleepWindDownCfg;
}): JSX.Element => {
  const hasInitialValue = "initialCfg" in props;
  const [cfg, setCfg] = createSignal<SleepWindDownCfg>(
    props.initialCfg ?? DEFAULT_SLEEP_WIND_DOWN,
  );
  const [loaded, setLoaded] = createSignal(hasInitialValue);

  onMount(() => {
    if (hasInitialValue) return;

    getSyncData().then((sd) => {
      if (sd.cfg.sleepWindDown) setCfg(sd.cfg.sleepWindDown);
      setLoaded(true);
    });
  });

  const persist = async (next: SleepWindDownCfg) => {
    if (!props.autoSave) return;
    await updateUserCfg({ sleepWindDown: next });
  };

  const apply = (mutate: (prev: SleepWindDownCfg) => SleepWindDownCfg) => {
    setCfg((prev) => {
      const next = mutate(prev);
      persist(next);
      return next;
    });
  };

  const toggleEnabled = () => {
    apply((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const setDays = (days: DaysMap) => {
    apply((prev) => ({ ...prev, days }));
  };

  const enabledDayCount = () =>
    Object.values(cfg().days).filter((r) => r !== null).length;

  return (
    <div class={styles.FocusSchedule}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Sleep wind-down
        </h3>
        <Toggle
          checked={cfg().enabled}
          onChange={toggleEnabled}
          label={cfg().enabled ? "On" : "Off"}
        />
      </div>
      <p class={styles.description}>
        {cfg().enabled
          ? enabledDayCount() === 0
            ? "Wind-down is on, but no days are selected - turn at least one day on below."
            : "When the time arrives, minded will gently prompt you to wind down."
          : "Enable to be gently prompted to wind down at bedtime."}
      </p>
      <Show when={loaded()}>
        <WeekdaySchedule
          days={cfg().days}
          onChange={setDays}
          disabled={!cfg().enabled}
          defaultRange={DEFAULT_DAY_RANGE}
        />
      </Show>
    </div>
  );
};

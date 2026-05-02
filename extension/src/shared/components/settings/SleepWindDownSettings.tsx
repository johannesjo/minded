import { createSignal, For, JSX, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  getSyncData,
  updateSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import { SleepWindDownCfg } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import { Checkbox } from "@src/shared/components/ui/Checkbox";
import { TimeInput } from "@src/shared/components/ui/TimeInput";
import {
  DEFAULT_DAY_RANGE,
  resolveNightId,
} from "@src/shared/components/sleepWindDown/sleepWindDown.util";
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
  /** If true, persist each edit immediately. */
  autoSave?: boolean;
}): JSX.Element => {
  const navigate = useNavigate();
  const [cfg, setCfg] = createSignal<SleepWindDownCfg>(DEFAULT_SLEEP_WIND_DOWN);
  const [pausedTonight, setPausedTonight] = createSignal(false);

  onMount(() => {
    getSyncData().then((sd) => {
      const swd = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
      if (sd.cfg.sleepWindDown) setCfg(sd.cfg.sleepWindDown);
      // Only surface "Paused for tonight" while we're actually inside the
      // dismissed window — otherwise the banner sits there all day after
      // a 22:00 skip even when wind-down would not be active anyway.
      const dismissed = sd.sleepWindDownDismissedNightId;
      const currentNightId = resolveNightId(swd);
      setPausedTonight(!!currentNightId && dismissed === currentNightId);
    });
  });

  const persist = async (next: SleepWindDownCfg) => {
    if (!props.autoSave) return;
    await updateUserCfg({ sleepWindDown: next });
    if (!next.enabled) {
      // Clear any stale snooze deadline so re-enabling later doesn't
      // suppress the next configured window.
      await updateSyncData({ sleepWindDownSnoozeUntilTS: 0 });
    }
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

  const toggleDay = (idx: number) => {
    apply((prev) => {
      const days = { ...prev.days };
      // Preserve the previous range when re-enabling a day if available;
      // otherwise seed with the default night window.
      days[idx] = days[idx] ? null : { ...DEFAULT_DAY_RANGE };
      return { ...prev, days };
    });
  };

  const updateTime = (idx: number, field: "start" | "end", value: string) => {
    apply((prev) => {
      const cur = prev.days[idx];
      if (!cur) return prev;
      return {
        ...prev,
        days: { ...prev.days, [idx]: { ...cur, [field]: value } },
      };
    });
  };

  const isDayEnabled = (idx: number) => !!cfg().days[idx];
  const getRange = (idx: number) => cfg().days[idx] || DEFAULT_DAY_RANGE;
  const enabledDayCount = () =>
    Object.values(cfg().days).filter((r) => r !== null).length;

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
          ? enabledDayCount() === 0
            ? "Wind-down is on, but no days are selected — turn at least one day on below."
            : "When the time arrives, minded will gently prompt you to wind down."
          : "Enable to be gently prompted to wind down at bedtime."}
      </p>
      {pausedTonight() && cfg().enabled && (
        <p class={styles.description} style={{ "font-style": "italic" }}>
          Paused for tonight — wind-down will resume tomorrow.
        </p>
      )}
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
      <div style={{ "margin-top": "16px", "text-align": "center" }}>
        <button
          class="btnTxtOutline"
          onClick={() => navigate("/sleepWindDown?preview=1")}
        >
          Try wind-down now
        </button>
      </div>
    </div>
  );
};

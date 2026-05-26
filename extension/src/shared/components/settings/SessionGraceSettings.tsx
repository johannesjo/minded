import { Component, createSignal, For, onMount } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { SessionGraceCfg } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import styles from "./BudgetSettings.module.scss";

interface SessionGraceSettingsProps {
  onAfterSave?: () => void;
}

const GRACE_OPTIONS = [
  { label: "1 min", value: 1 },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
];

const DEFAULT_GRACE_MINUTES = 5;

export const SessionGraceSettings: Component<SessionGraceSettingsProps> = (
  props,
) => {
  const [getGrace, setGrace] = createSignal<SessionGraceCfg | undefined>(
    undefined,
  );

  onMount(async () => {
    const syncData = await getSyncData();
    setGrace(syncData.cfg.sessionGrace);
  });

  const isEnabled = () => getGrace()?.enabled === true;

  const minutes = () => getGrace()?.minutes ?? DEFAULT_GRACE_MINUTES;

  const save = async (next: SessionGraceCfg) => {
    setGrace(next);
    await updateUserCfg({ sessionGrace: next });
    props.onAfterSave?.();
  };

  const toggleEnabled = async () => {
    await save({ enabled: !isEnabled(), minutes: minutes() });
  };

  const setMinutes = async (newMinutes: number) => {
    await save({ enabled: true, minutes: newMinutes });
  };

  return (
    <div class={styles.BudgetSettings}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Grace Period
        </h3>
        <Toggle
          checked={isEnabled()}
          onChange={toggleEnabled}
          label={isEnabled() ? "On" : "Off"}
        />
      </div>

      <p class={styles.description}>
        {isEnabled()
          ? "Each fresh visit to a blocked site or app starts with uninterrupted time. Interventions kick in once the grace minutes are up."
          : "Allow the first few minutes of each session before interventions begin."}
      </p>

      {isEnabled() && (
        <div class={styles.options}>
          <div class={styles.optionsLabel}>Grace per session:</div>
          <div class={styles.optionsGrid}>
            <For each={GRACE_OPTIONS}>
              {(option) => (
                <button
                  type="button"
                  class={
                    minutes() === option.value
                      ? "btnToggleSelect isSelected"
                      : "btnToggleSelect"
                  }
                  onClick={() => setMinutes(option.value)}
                >
                  {option.label}
                </button>
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  );
};

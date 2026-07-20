import { createSignal, For, JSX, onMount } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { SessionGraceCfg } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import Btn from "@src/shared/components/ui/Btn";
import styles from "./SessionGraceSettings.module.scss";

const GRACE_OPTIONS = [
  { label: "1 min", value: 1 },
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
];

const DEFAULT_GRACE_MINUTES = 5;

export const SessionGraceSettings = (
  props: { initialGrace?: SessionGraceCfg } = {},
): JSX.Element => {
  const hasInitialValue = "initialGrace" in props;
  const [getGrace, setGrace] = createSignal<SessionGraceCfg | undefined>(
    props.initialGrace,
  );

  onMount(async () => {
    if (hasInitialValue) return;

    const syncData = await getSyncData();
    setGrace(syncData.cfg.sessionGrace);
  });

  const isEnabled = () => getGrace()?.enabled === true;

  const minutes = () => getGrace()?.minutes ?? DEFAULT_GRACE_MINUTES;

  const save = async (next: SessionGraceCfg) => {
    setGrace(next);
    await updateUserCfg({ sessionGrace: next });
  };

  const toggleEnabled = async () => {
    await save({ enabled: !isEnabled(), minutes: minutes() });
  };

  const setMinutes = async (newMinutes: number) => {
    await save({ enabled: true, minutes: newMinutes });
  };

  return (
    <div class={styles.SessionGraceSettings}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Grace period
        </h3>
        <Toggle
          checked={isEnabled()}
          onChange={toggleEnabled}
          label={isEnabled() ? "On" : "Off"}
        />
      </div>

      <p class={styles.description}>
        {isEnabled()
          ? "Each fresh visit to a site or app you've chosen starts with uninterrupted time. The sun arrives once the grace minutes are up."
          : "Allow the first few minutes of each session before interventions begin."}
      </p>

      {isEnabled() && (
        <div class={styles.options}>
          <div class={styles.optionsLabel}>Grace per session:</div>
          <div class={styles.optionsGrid}>
            <For each={GRACE_OPTIONS}>
              {(option) => (
                <Btn
                  variant="toggle"
                  selected={minutes() === option.value}
                  onClick={() => setMinutes(option.value)}
                >
                  {option.label}
                </Btn>
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  );
};

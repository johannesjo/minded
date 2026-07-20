import { createSignal, onMount, Show } from "solid-js";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { UserCfg } from "@src/dataInterface/syncData";
import { SettingsAndroid } from "./SettingsAndroid";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SleepWindDownSettings } from "@src/shared/components/settings/SleepWindDownSettings";
import { resolveSettingsCfg } from "@src/shared/components/settings/settingsHydration";
import styles from "./SettingsAndroidRoute.module.scss";

export const SettingsAndroidRoute = () => {
  const [cfg, setCfg] = createSignal<UserCfg>();

  onMount(async () => {
    setCfg(await resolveSettingsCfg(getSyncData));
  });

  return (
    <div class={`pageTransitionIn pageWrapper ${styles.SettingsAndroidRoute}`}>
      <h2 class="h2">Settings</h2>

      <Show when={cfg()} keyed>
        {(initialCfg) => (
          <div class={styles.sections}>
            <SettingsAndroid
              autoSave={true}
              initialBlockedApps={initialCfg.blockedApps}
            />

            <hr class={styles.divider} />

            <SoundSettings
              initialSoundEnabled={initialCfg.soundEnabled ?? true}
            />

            <hr class={styles.divider} />

            <SessionGraceSettings initialGrace={initialCfg.sessionGrace} />

            <hr class={styles.divider} />

            <FocusSchedule initialSchedule={initialCfg.focusSchedule} />

            <hr class={styles.divider} />

            <SleepWindDownSettings
              autoSave={true}
              initialCfg={initialCfg.sleepWindDown}
            />
          </div>
        )}
      </Show>

      {/* No in-page Back button: the bottom bar's arrow is the one way back,
          same as every other sub-page. */}
    </div>
  );
};

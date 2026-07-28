import { createSignal, onMount, Show } from "solid-js";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { SettingsAndroid } from "./SettingsAndroid";
import { AlternativesSettings } from "@src/shared/components/settings/AlternativesSettings";
import { CustomQuestionsSettings } from "@src/shared/components/settings/CustomQuestionsSettings";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SleepWindDownSettings } from "@src/shared/components/settings/SleepWindDownSettings";
import {
  resolveSettingsSnapshot,
  type SettingsSnapshot,
} from "@src/shared/components/settings/settingsHydration";
import styles from "./SettingsAndroidRoute.module.scss";

export const SettingsAndroidRoute = () => {
  const [settings, setSettings] = createSignal<SettingsSnapshot>();

  onMount(async () => {
    setSettings(await resolveSettingsSnapshot(getSyncData, "android"));
  });

  return (
    <div class={`pageTransitionIn pageWrapper ${styles.SettingsAndroidRoute}`}>
      <h2 class="h2">Settings</h2>

      <Show when={settings()} keyed>
        {(initial) => (
          <div class={styles.sections}>
            <SettingsAndroid
              autoSave={true}
              initialBlockedApps={initial.cfg.blockedApps}
            />

            <hr class={styles.divider} />

            <AlternativesSettings initialAlternatives={initial.alternatives} />

            <hr class={styles.divider} />

            <CustomQuestionsSettings
              initialCustomQuestions={initial.customQuestions}
            />

            <hr class={styles.divider} />

            <SoundSettings
              initialSoundEnabled={initial.cfg.soundEnabled ?? true}
            />

            <hr class={styles.divider} />

            <SessionGraceSettings initialGrace={initial.cfg.sessionGrace} />

            <hr class={styles.divider} />

            <FocusSchedule initialSchedule={initial.cfg.focusSchedule} />

            <hr class={styles.divider} />

            <SleepWindDownSettings
              autoSave={true}
              initialCfg={initial.cfg.sleepWindDown}
            />
          </div>
        )}
      </Show>

      {/* No in-page Back button: the bottom bar's arrow is the one way back,
          same as every other sub-page. */}
    </div>
  );
};

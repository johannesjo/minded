import { createSignal, onMount, Show } from "solid-js";
import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { AlternativesSettings } from "@src/shared/components/settings/AlternativesSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import {
  resolveSettingsSnapshot,
  type SettingsSnapshot,
} from "@src/shared/components/settings/settingsHydration";
import styles from "./Options.module.scss";

const Options = () => {
  const [settings, setSettings] = createSignal<SettingsSnapshot>();

  onMount(async () => {
    setSettings(await resolveSettingsSnapshot(getSyncData, "web"));
  });

  return (
    <div class={`pageTransitionIn ${styles.Options}`}>
      <header class={styles.header}>
        <h2 class="h2">Settings</h2>
        <p>Choose where and when minded appears. Changes save automatically.</p>
      </header>

      <Show when={settings()} keyed>
        {(initial) => (
          <div class={styles.sections}>
            <section class={styles.section}>
              <div class={styles.sectionIntro}>
                <h3 class="h3">Websites</h3>
                <p>Add domains only, for example youtube.com or reddit.com.</p>
              </div>
              <WebsiteList
                showSaveButton={false}
                initialItems={initial.cfg.blockedHosts}
              />
            </section>

            <section class={styles.section}>
              <AlternativesSettings
                initialAlternatives={initial.alternatives}
              />
            </section>

            {/* No section intros here: these components carry their own heading
                and a state-aware description, so a wrapper heading would just say
                everything twice. Only the website list above needs the section
                to speak for it. */}
            <section class={styles.section}>
              <SoundSettings
                initialSoundEnabled={initial.cfg.soundEnabled ?? true}
              />
            </section>

            <section class={styles.section}>
              <SessionGraceSettings initialGrace={initial.cfg.sessionGrace} />
            </section>

            <section class={styles.section}>
              <FocusSchedule initialSchedule={initial.cfg.focusSchedule} />
            </section>
          </div>
        )}
      </Show>
    </div>
  );
};

export default Options;

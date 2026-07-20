import { createSignal, onMount, Show } from "solid-js";
import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { UserCfg } from "@src/dataInterface/syncData";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { resolveSettingsCfg } from "@src/shared/components/settings/settingsHydration";
import styles from "./Options.module.scss";

const Options = () => {
  const [cfg, setCfg] = createSignal<UserCfg>();

  onMount(async () => {
    setCfg(await resolveSettingsCfg(getSyncData));
  });

  return (
    <div class={`pageTransitionIn ${styles.Options}`}>
      <header class={styles.header}>
        <h2 class="h2">Settings</h2>
        <p>Choose where and when minded appears. Changes save automatically.</p>
      </header>

      <Show when={cfg()} keyed>
        {(initialCfg) => (
          <div class={styles.sections}>
            <section class={styles.section}>
              <div class={styles.sectionIntro}>
                <h3 class="h3">Websites</h3>
                <p>Add domains only, for example youtube.com or reddit.com.</p>
              </div>
              <WebsiteList
                showSaveButton={false}
                initialItems={initialCfg.blockedHosts}
              />
            </section>

            {/* No section intros here: these components carry their own heading
                and a state-aware description, so a wrapper heading would just say
                everything twice. Only the website list above needs the section
                to speak for it. */}
            <section class={styles.section}>
              <SoundSettings
                initialSoundEnabled={initialCfg.soundEnabled ?? true}
              />
            </section>

            <section class={styles.section}>
              <SessionGraceSettings initialGrace={initialCfg.sessionGrace} />
            </section>

            <section class={styles.section}>
              <FocusSchedule initialSchedule={initialCfg.focusSchedule} />
            </section>
          </div>
        )}
      </Show>
    </div>
  );
};

export default Options;

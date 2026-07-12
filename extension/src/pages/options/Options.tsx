import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import styles from "./Options.module.scss";

const Options = () => {
  return (
    <div class={`pageTransitionIn ${styles.Options}`}>
      <header class={styles.header}>
        <h2 class="h2">Settings</h2>
        <p>Choose where and when minded appears. Changes save automatically.</p>
      </header>

      <div class={styles.sections}>
        <section class={styles.section}>
          <div class={styles.sectionIntro}>
            <h3 class="h3">Websites</h3>
            <p>Add domains only, for example youtube.com or reddit.com.</p>
          </div>
          <WebsiteList showSaveButton={false} />
        </section>

        {/* No section intros here: these components carry their own heading
            and a state-aware description, so a wrapper heading would just say
            everything twice ("Grace Period" / "Grace Period"). Only the
            website list above needs the section to speak for it. */}
        <section class={styles.section}>
          <SoundSettings />
        </section>

        <section class={styles.section}>
          <SessionGraceSettings />
        </section>

        <section class={styles.section}>
          <FocusSchedule />
        </section>
      </div>
    </div>
  );
};

export default Options;

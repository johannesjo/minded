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

        <section class={styles.section}>
          <div class={styles.sectionIntro}>
            <h3 class="h3">Sound</h3>
            <p>Control whether interventions can play gentle audio cues.</p>
          </div>
          <SoundSettings />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionIntro}>
            <h3 class="h3">Grace Period</h3>
            <p>
              Skip the intervention for the first few minutes of each fresh
              session.
            </p>
          </div>
          <SessionGraceSettings />
        </section>

        <section class={styles.section}>
          <div class={styles.sectionIntro}>
            <h3 class="h3">Active Hours</h3>
            <p>Limit blocking to the parts of the week where it helps most.</p>
          </div>
          <FocusSchedule />
        </section>
      </div>
    </div>
  );
};

export default Options;

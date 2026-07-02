import { SettingsAndroid } from "./SettingsAndroid";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SleepWindDownSettings } from "@src/shared/components/settings/SleepWindDownSettings";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import styles from "./SettingsAndroidRoute.module.scss";

export const SettingsAndroidRoute = () => {
  return (
    <div class="pageTransitionIn">
      <h2 class="h2 h2Mindful">
        <em>minded</em> – Settings
      </h2>

      <SettingsAndroid autoSave={true} />

      <hr class={styles.divider} />

      <SoundSettings />

      <hr class={styles.divider} />

      <SessionGraceSettings />

      <hr class={styles.divider} />

      <FocusSchedule />

      <hr class={styles.divider} />

      <SleepWindDownSettings autoSave={true} />

      <div class={styles.backWrapper}>
        <Btn href="/">
          <Ico name="arrowBack" /> Back
        </Btn>
      </div>
    </div>
  );
};

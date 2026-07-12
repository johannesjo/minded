import { SettingsAndroid } from "./SettingsAndroid";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SleepWindDownSettings } from "@src/shared/components/settings/SleepWindDownSettings";
import styles from "./SettingsAndroidRoute.module.scss";

export const SettingsAndroidRoute = () => {
  return (
    <div
      class={`pageTransitionIn pageWrapper ${styles.SettingsAndroidRoute}`}
    >
      <h2 class="h2">Settings</h2>

      <SettingsAndroid autoSave={true} />

      <hr class={styles.divider} />

      <SoundSettings />

      <hr class={styles.divider} />

      <SessionGraceSettings />

      <hr class={styles.divider} />

      <FocusSchedule />

      <hr class={styles.divider} />

      <SleepWindDownSettings autoSave={true} />

      {/* No in-page Back button: the bottom bar's arrow is the one way back,
          same as every other sub-page. */}
    </div>
  );
};

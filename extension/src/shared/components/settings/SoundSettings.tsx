import { createSignal, JSX, onMount } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { Toggle } from "@src/shared/components/ui/Toggle";
import styles from "./SoundSettings.module.scss";

export const SoundSettings = (
  props: { initialSoundEnabled?: boolean } = {},
): JSX.Element => {
  const hasInitialValue = "initialSoundEnabled" in props;
  const [soundEnabled, setSoundEnabled] = createSignal(
    props.initialSoundEnabled ?? true,
  );

  onMount(() => {
    if (hasInitialValue) return;

    getSyncData().then((syncData) => {
      setSoundEnabled(syncData.cfg.soundEnabled ?? true);
    });
  });

  const toggleSound = async () => {
    const newValue = !soundEnabled();
    setSoundEnabled(newValue);
    await updateUserCfg({ soundEnabled: newValue });
  };

  return (
    <div class={styles.SoundSettings}>
      <div class={styles.header}>
        <h3 class="h3">Completion sound</h3>
        <Toggle
          checked={soundEnabled()}
          onChange={toggleSound}
          label={soundEnabled() ? "On" : "Off"}
        />
      </div>
      <p class={styles.description}>
        A soft bell marks the end of a guided pause.
      </p>
    </div>
  );
};

import { createSignal, JSX } from "solid-js";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { Toggle } from "@src/shared/components/ui/Toggle";
import styles from "./SoundSettings.module.scss";

/**
 * The mindfulness bell (Android): once or twice a day, at an unpredictable
 * moment, the sun rings a bell over whatever you're doing. The bell itself is
 * wordless, so this description is the one place the practice is explained.
 * Off by default - it is the one surface that reaches for the user unprompted,
 * so it only exists for someone who asked for it.
 */
export const MindfulnessBellSettings = (props: {
  initialEnabled: boolean;
}): JSX.Element => {
  const [enabled, setEnabled] = createSignal(props.initialEnabled);

  const toggle = async () => {
    const newValue = !enabled();
    setEnabled(newValue);
    await updateUserCfg({ mindfulnessBell: newValue });
  };

  return (
    <div class={styles.SoundSettings}>
      <div class={styles.header}>
        <h3 class="h3">Mindfulness bell</h3>
        <Toggle
          checked={enabled()}
          onChange={toggle}
          label={enabled() ? "On" : "Off"}
        />
      </div>
      <p class={styles.description}>
        Once or twice a day, the sun rings a bell over whatever you're doing.
        Stop, watch the light fade, carry on.
      </p>
    </div>
  );
};

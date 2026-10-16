import { createSignal, JSX, Show } from "solid-js";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import type { MindfulnessBellPerDay } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import {
  BELL_PER_DAY_MAX,
  BELL_PER_DAY_MIN,
  bellPerDayLabel,
  DEFAULT_BELL_PER_DAY,
} from "./mindfulnessBell.const";
import styles from "./SoundSettings.module.scss";
import bellStyles from "./MindfulnessBellSettings.module.scss";

/**
 * The mindfulness bell (Android): a few times a day, at an unpredictable
 * moment, the sun rings a bell over whatever you're doing. The bell itself is
 * wordless, so this description is the one place the practice is explained.
 * Off by default - it is the one surface that reaches for the user unprompted,
 * so it only exists for someone who asked for it.
 */
export const MindfulnessBellSettings = (props: {
  initialEnabled: boolean;
  initialPerDay?: MindfulnessBellPerDay;
}): JSX.Element => {
  const [enabled, setEnabled] = createSignal(props.initialEnabled);
  const [perDay, setPerDay] = createSignal(
    props.initialPerDay ?? DEFAULT_BELL_PER_DAY,
  );

  const toggle = async () => {
    const newValue = !enabled();
    setEnabled(newValue);
    await updateUserCfg({ mindfulnessBell: newValue });
  };

  const choosePerDay = async (value: MindfulnessBellPerDay) => {
    setPerDay(value);
    await updateUserCfg({ mindfulnessBellPerDay: value });
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
        Now and then, the sun rings a bell over whatever you're doing. Pause,
        watch the light fade, carry on.
      </p>
      <Show when={enabled()}>
        <div class={bellStyles.options}>
          <input
            type="range"
            class={bellStyles.slider}
            min={BELL_PER_DAY_MIN}
            max={BELL_PER_DAY_MAX}
            step="1"
            value={perDay()}
            onInput={(e) => setPerDay(Number(e.currentTarget.value))}
            onChange={(e) => void choosePerDay(Number(e.currentTarget.value))}
            aria-label="How often the bell rings"
          />
          <span>{bellPerDayLabel(perDay())}</span>
        </div>
      </Show>
    </div>
  );
};

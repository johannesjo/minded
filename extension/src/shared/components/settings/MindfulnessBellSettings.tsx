import { createSignal, For, JSX, Show } from "solid-js";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import type { MindfulnessBellPerDay } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import Btn from "@src/shared/components/ui/Btn";
import styles from "./MindfulnessBellSettings.module.scss";

/** Mirrors MindfulnessBellSchedule.DEFAULT_SLOTS_PER_DAY. */
export const DEFAULT_BELL_PER_DAY: MindfulnessBellPerDay = 2;

const PER_DAY_OPTIONS: ReadonlyArray<{
  value: MindfulnessBellPerDay;
  label: string;
}> = [
  { value: 1, label: "Once a day" },
  { value: 2, label: "Twice a day" },
  { value: 3, label: "Three times a day" },
];

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
    <div class={styles.MindfulnessBellSettings}>
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
        <div class={styles.options}>
          <For each={PER_DAY_OPTIONS}>
            {(option) => (
              <Btn
                variant="toggle"
                small
                selected={perDay() === option.value}
                onClick={() => void choosePerDay(option.value)}
              >
                {option.label}
              </Btn>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

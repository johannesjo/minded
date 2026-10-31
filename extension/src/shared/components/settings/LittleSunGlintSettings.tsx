import { createSignal, For, JSX, Show } from "solid-js";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import { Toggle } from "@src/shared/components/ui/Toggle";
import Btn from "@src/shared/components/ui/Btn";
import {
  getLittleSunGlintEveryS,
  LITTLE_SUN_GLINT_DEFAULT_MINUTES,
  LITTLE_SUN_GLINT_MINUTES_OPTIONS,
} from "@src/shared/components/interaction/littleSunGlint";
// Same layout as the grace period: a toggle, then a row of choices.
import styles from "./SessionGraceSettings.module.scss";

/**
 * How often the sun that keeps the user company during a stay (the Little
 * Sun) glows brighter for a moment - a wordless reminder that a pause is
 * there. On by default; off stores 0.
 */
export const LittleSunGlintSettings = (props: {
  initialMinutes?: number;
}): JSX.Element => {
  const initialEveryS = getLittleSunGlintEveryS(props.initialMinutes);
  const [enabled, setEnabled] = createSignal(initialEveryS !== null);
  const [minutes, setMinutes] = createSignal(
    initialEveryS !== null
      ? initialEveryS / 60
      : LITTLE_SUN_GLINT_DEFAULT_MINUTES,
  );

  const toggle = async () => {
    const next = !enabled();
    setEnabled(next);
    await updateUserCfg({ littleSunGlintMinutes: next ? minutes() : 0 });
  };

  const choose = async (value: number) => {
    setMinutes(value);
    await updateUserCfg({ littleSunGlintMinutes: value });
  };

  return (
    <div class={styles.SessionGraceSettings}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Glow reminder
        </h3>
        <Toggle
          checked={enabled()}
          onChange={toggle}
          label={enabled() ? "On" : "Off"}
        />
      </div>
      <p class={styles.description}>
        While you stay on a site or app you've chosen, the sun keeping you
        company glows brighter for a moment now and then - a quiet reminder that
        a pause is there.
      </p>
      <Show when={enabled()}>
        <div class={styles.options}>
          <div class={styles.optionsLabel}>Glow every:</div>
          <div class={styles.optionsGrid}>
            <For each={LITTLE_SUN_GLINT_MINUTES_OPTIONS}>
              {(value) => (
                <Btn
                  variant="toggle"
                  selected={minutes() === value}
                  onClick={() => void choose(value)}
                >
                  {value} min
                </Btn>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

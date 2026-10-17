import { createSignal, JSX, onCleanup, onMount, Show } from "solid-js";
import { updateUserCfg } from "@src/dataInterface/commonSyncDataInterface";
import type { MindfulnessBellPerDay } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import Btn from "@src/shared/components/ui/Btn";
import {
  BELL_PER_DAY_MAX,
  BELL_PER_DAY_MIN,
  bellPerDayLabel,
  DEFAULT_BELL_PER_DAY,
} from "./mindfulnessBell.const";
import {
  bellLastCheckLabel,
  bellLastUnlockLabel,
  bellTraceLabel,
} from "./mindfulnessBellLastCheck";
import {
  ANDROID_EV_RESUME,
  androidInterface,
} from "@src/dataInterface/android/androidInterface";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
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
  // What the last due bell did, so a bell that's never heard can be understood.
  const readLastCheck = () =>
    IS_ANDROID
      ? bellLastCheckLabel(androidInterface.getMindfulnessBellLastCheck?.())
      : undefined;
  // And what it made of the last unlock, so "never reached" shows too.
  const readLastUnlock = () =>
    IS_ANDROID
      ? bellLastUnlockLabel(androidInterface.getMindfulnessBellLastUnlock?.())
      : undefined;
  // TEMPORARY: how far the last unlock got, while the unlock path is debugged.
  const readTrace = () =>
    IS_ANDROID
      ? bellTraceLabel(androidInterface.getMindfulnessBellTrace?.())
      : undefined;
  const [trace, setTrace] = createSignal(readTrace());
  // TEMPORARY test aid: ring at the next unlock instead of waiting for a window.
  const readTestArmed = () =>
    IS_ANDROID && !!androidInterface.isMindfulnessBellTestArmed?.();
  const [testArmed, setTestArmed] = createSignal(readTestArmed());
  const armTest = () => {
    androidInterface.armMindfulnessBellTest?.();
    setTestArmed(readTestArmed());
  };
  const [lastCheck, setLastCheck] = createSignal(readLastCheck());
  const [lastUnlock, setLastUnlock] = createSignal(readLastUnlock());

  // Unlocks happen while the app is away: re-read on return, or a settings
  // page left open across a lock/unlock keeps showing what it saw on mount.
  onMount(() => {
    if (!IS_ANDROID) return;
    const refresh = () => {
      setLastCheck(readLastCheck());
      setLastUnlock(readLastUnlock());
      setTrace(readTrace());
      setTestArmed(readTestArmed());
    };
    window.addEventListener(ANDROID_EV_RESUME, refresh);
    onCleanup(() => window.removeEventListener(ANDROID_EV_RESUME, refresh));
  });

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
          <Show when={lastCheck()}>
            <span class={bellStyles.lastCheck}>{lastCheck()}</span>
          </Show>
          <Show when={lastUnlock()}>
            <span class={bellStyles.lastCheck}>{lastUnlock()}</span>
          </Show>
          <Show when={trace()}>
            <span class={bellStyles.lastCheck}>{trace()}</span>
          </Show>
          <Show when={IS_ANDROID && androidInterface.armMindfulnessBellTest}>
            <Btn outline disabled={testArmed()} onClick={armTest}>
              {testArmed()
                ? "Rings at your next unlock"
                : "Ring at next unlock (test)"}
            </Btn>
          </Show>
        </div>
      </Show>
    </div>
  );
};

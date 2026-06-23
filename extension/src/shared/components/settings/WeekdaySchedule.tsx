import { createSignal, Index, JSX, Show } from "solid-js";
import { TimeRange } from "@src/dataInterface/syncData";
import { Checkbox } from "@src/shared/components/ui/Checkbox";
import { TimeInput } from "@src/shared/components/ui/TimeInput";
import Btn from "@src/shared/components/ui/Btn";
// @ts-ignore — reuse FocusSchedule's layout styles
import styles from "./FocusSchedule.module.scss";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6];

export type DaysMap = { [dayIndex: number]: TimeRange | null };

/** Build a days map with every day sharing the same range. */
const everyDay = (range: TimeRange): DaysMap => {
  const days: DaysMap = {};
  for (const i of DAY_INDICES) days[i] = { ...range };
  return days;
};

/** All seven days enabled and sharing one identical start/end range. */
const isUniform = (days: DaysMap): boolean => {
  const first = days[0];
  if (!first) return false;
  return DAY_INDICES.every((i) => {
    const d = days[i];
    return !!d && d.start === first.start && d.end === first.end;
  });
};

/** A representative range for the collapsed single-setting view. */
const representativeRange = (days: DaysMap, fallback: TimeRange): TimeRange => {
  for (const i of DAY_INDICES) {
    const d = days[i];
    if (d) return { ...d };
  }
  return { ...fallback };
};

/**
 * Weekday schedule editor. By default it shows a single time range that applies
 * to every day — the simplest setting that works. Users who need per-day
 * control can expand to toggle individual days and give each its own times.
 *
 * The collapsed/expanded choice is purely a UI affordance: the stored shape is
 * always the per-day `DaysMap`, so readers (focus hours, wind-down windows) and
 * the Android side stay unchanged.
 */
export const WeekdaySchedule = (props: {
  days: DaysMap;
  onChange: (days: DaysMap) => void;
  /** Whole feature toggled off — render everything as inert. */
  disabled?: boolean;
  /** Seed range for a freshly enabled day / the collapsed view. */
  defaultRange: TimeRange;
}): JSX.Element => {
  // Start collapsed only when the saved schedule is genuinely uniform; a custom
  // per-day config opens expanded so it's never silently flattened on screen.
  const [expanded, setExpanded] = createSignal(!isUniform(props.days));

  const single = (): TimeRange =>
    representativeRange(props.days, props.defaultRange);

  const updateSingle = (field: "start" | "end", value: string) => {
    props.onChange(everyDay({ ...single(), [field]: value }));
  };

  const collapse = () => {
    // "Same time every day" turns every day on with one shared range.
    props.onChange(everyDay(single()));
    setExpanded(false);
  };

  const toggleDay = (idx: number) => {
    const cur = props.days[idx];
    props.onChange({ ...props.days, [idx]: cur ? null : { ...single() } });
  };

  const updateDayTime = (
    idx: number,
    field: "start" | "end",
    value: string,
  ) => {
    const cur = props.days[idx];
    if (!cur) return;
    props.onChange({ ...props.days, [idx]: { ...cur, [field]: value } });
  };

  const isDayEnabled = (idx: number) => !!props.days[idx];
  const getRange = (idx: number) => props.days[idx] || props.defaultRange;

  return (
    <div class={styles.daysList} id="weekday-schedule-rows">
      <Show
        when={expanded()}
        fallback={
          // <Show> remounts whichever branch is active on each toggle, so the
          // fadeIn animation replays — keeping open/close soft, not a hard cut.
          <div
            class={`${styles.dayRow} ${styles.fadeIn} ${props.disabled ? styles.isDisabled : ""}`}
          >
            <span class={styles.checkboxSpacer} aria-hidden="true" />
            <span class={styles.dayName}>Every day</span>
            <div class={styles.timeInputs}>
              <TimeInput
                value={single().start}
                onChange={(v) => updateSingle("start", v)}
                disabled={props.disabled}
                aria-label="Start time, every day"
              />
              <span class={styles.timeSeparator}>to</span>
              <TimeInput
                value={single().end}
                onChange={(v) => updateSingle("end", v)}
                disabled={props.disabled}
                aria-label="End time, every day"
              />
            </div>
          </div>
        }
      >
        <div class={styles.fadeIn}>
          <Index each={DAY_NAMES}>
            {(name, index) => (
              <div
                class={`${styles.dayRow} ${props.disabled ? styles.isDisabled : ""}`}
              >
                <Checkbox
                  checked={isDayEnabled(index)}
                  onChange={() => toggleDay(index)}
                  disabled={props.disabled}
                />
                <span
                  class={styles.dayName}
                  onClick={() => !props.disabled && toggleDay(index)}
                >
                  {name()}
                </span>
                <div class={styles.timeInputs}>
                  <TimeInput
                    value={getRange(index).start}
                    onChange={(v) => updateDayTime(index, "start", v)}
                    disabled={props.disabled || !isDayEnabled(index)}
                    aria-label={`Start time, ${name()}`}
                  />
                  <span class={styles.timeSeparator}>to</span>
                  <TimeInput
                    value={getRange(index).end}
                    onChange={(v) => updateDayTime(index, "end", v)}
                    disabled={props.disabled || !isDayEnabled(index)}
                    aria-label={`End time, ${name()}`}
                  />
                </div>
              </div>
            )}
          </Index>
        </div>
      </Show>

      <div class={styles.expandToggle}>
        <Btn
          outline
          disabled={props.disabled}
          aria-expanded={expanded()}
          aria-controls="weekday-schedule-rows"
          onClick={() => (expanded() ? collapse() : setExpanded(true))}
        >
          {expanded()
            ? "Use the same time every day"
            : "Set different times per day"}
        </Btn>
      </div>
    </div>
  );
};

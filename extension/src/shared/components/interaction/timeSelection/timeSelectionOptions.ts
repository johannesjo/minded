export interface TimeOption {
  label: string;
  value: number;
}

// "rest of day" (value -1) grants screen time until the next midnight. That
// reads as a sane daytime choice, but in the small hours it inverts the meaning
// of the moment: at 3am it hands out ~21 hours right when the wind-down is
// asking you to let the day go. So between midnight and 6am we drop it and leave
// only the capped durations; it returns once the day proper begins.
export const REST_OF_DAY_VALUE = -1;
export const DEEP_NIGHT_START_HOUR = 0;
export const DEEP_NIGHT_END_HOUR = 6;

export const TIME_OPTIONS: TimeOption[] = [
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "rest of day", value: REST_OF_DAY_VALUE },
];

/** True for the deep-night window [0:00, 6:00) where "rest of day" is dropped. */
export const isDeepNightHour = (hour: number): boolean =>
  hour >= DEEP_NIGHT_START_HOUR && hour < DEEP_NIGHT_END_HOUR;

/**
 * The session-length options to offer, given the current local hour. Identical
 * to TIME_OPTIONS by day; in the deep-night window it omits "rest of day".
 */
export const getTimeOptions = (hour: number): TimeOption[] =>
  isDeepNightHour(hour)
    ? TIME_OPTIONS.filter((option) => option.value !== REST_OF_DAY_VALUE)
    : TIME_OPTIONS;

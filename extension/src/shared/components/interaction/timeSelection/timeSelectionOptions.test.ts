import {
  getTimeOptions,
  isDeepNightHour,
  REST_OF_DAY_VALUE,
  TIME_OPTIONS,
} from "./timeSelectionOptions";

const hasRestOfDay = (options: { value: number }[]): boolean =>
  options.some((option) => option.value === REST_OF_DAY_VALUE);

describe("isDeepNightHour", () => {
  it("is true from midnight through 5am", () => {
    expect(isDeepNightHour(0)).toBe(true);
    expect(isDeepNightHour(3)).toBe(true);
    expect(isDeepNightHour(5)).toBe(true);
  });

  it("is false from 6am onward", () => {
    expect(isDeepNightHour(6)).toBe(false);
    expect(isDeepNightHour(12)).toBe(false);
    expect(isDeepNightHour(23)).toBe(false);
  });
});

describe("getTimeOptions", () => {
  it("drops 'rest of day' in the deep-night window", () => {
    for (const hour of [0, 1, 2, 3, 4, 5]) {
      const options = getTimeOptions(hour);
      expect(hasRestOfDay(options)).toBe(false);
      expect(options).toHaveLength(TIME_OPTIONS.length - 1);
    }
  });

  it("offers the full set (including 'rest of day') during the day", () => {
    for (const hour of [6, 9, 15, 22, 23]) {
      const options = getTimeOptions(hour);
      expect(hasRestOfDay(options)).toBe(true);
      expect(options).toEqual(TIME_OPTIONS);
    }
  });

  it("keeps the capped durations unchanged at night", () => {
    const night = getTimeOptions(3).map((option) => option.value);
    expect(night).toEqual([60, 300, 900, 1800, 3600]);
  });
});

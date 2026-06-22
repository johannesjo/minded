import {
  computeUsageObservation,
  MIN_BASELINE_DAYS,
} from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageObservation";
import {
  addUsageTime,
  UsageStatsByDate,
} from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageStats";

const at = (day: number, h: number): number =>
  new Date(2024, 2, day, h, 30, 0).getTime();

const NOW = at(10, 14); // 2024-03-10 14:30

describe("computeUsageObservation", () => {
  it("reports today's total and top targets, most-used first", () => {
    let stats: UsageStatsByDate = {};
    stats = addUsageTime(stats, "youtube.com", 600, at(10, 10));
    stats = addUsageTime(stats, "reddit.com", 1200, at(10, 11));
    stats = addUsageTime(stats, "news.com", 60, at(10, 12));

    const obs = computeUsageObservation(stats, NOW);
    expect(obs.todaySeconds).toBe(1860);
    expect(obs.topTargets.map((t) => t.id)).toEqual([
      "reddit.com",
      "youtube.com",
      "news.com",
    ]);
    expect(obs.topTargets[0].seconds).toBe(1200);
  });

  it("applies the label resolver to target ids", () => {
    const stats = addUsageTime({}, "com.instagram.android", 300, at(10, 9));
    const obs = computeUsageObservation(stats, NOW, (id) =>
      id === "com.instagram.android" ? "Instagram" : id,
    );
    expect(obs.topTargets[0].label).toBe("Instagram");
  });

  it("returns null baseline without enough prior days", () => {
    let stats: UsageStatsByDate = {};
    stats = addUsageTime(stats, "youtube.com", 300, at(9, 10));
    stats = addUsageTime(stats, "youtube.com", 300, at(8, 10));
    // Only two prior days < MIN_BASELINE_DAYS.
    expect(MIN_BASELINE_DAYS).toBeGreaterThan(2);
    const obs = computeUsageObservation(stats, NOW);
    expect(obs.baselineSeconds).toBeNull();
  });

  it("averages prior days' usage *through the current hour* for the baseline", () => {
    let stats: UsageStatsByDate = {};
    // Three prior days: 600s before hour 14 each, plus 9999s later in the day
    // that must NOT count toward a 14:30 baseline.
    for (const day of [7, 8, 9]) {
      stats = addUsageTime(stats, "youtube.com", 600, at(day, 9));
      stats = addUsageTime(stats, "youtube.com", 9999, at(day, 20));
    }
    const obs = computeUsageObservation(stats, NOW);
    expect(obs.baselineSeconds).toBe(600);
  });

  it("ignores days beyond the recent lookback window", () => {
    let stats: UsageStatsByDate = {};
    // Old days (far outside lookback) should not seed a baseline.
    for (const day of [1, 2, 3]) {
      stats = addUsageTime(stats, "youtube.com", 600, at(day - 20, 9));
    }
    const obs = computeUsageObservation(stats, NOW);
    expect(obs.baselineSeconds).toBeNull();
  });

  it("handles a fresh user with no data", () => {
    const obs = computeUsageObservation({}, NOW);
    expect(obs.todaySeconds).toBe(0);
    expect(obs.topTargets).toEqual([]);
    expect(obs.baselineSeconds).toBeNull();
  });
});

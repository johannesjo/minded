import { computeUsageObservation } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageObservation";
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

  it("ignores prior days - the observation is today's fact only, no baseline", () => {
    let stats: UsageStatsByDate = {};
    for (const day of [7, 8, 9]) {
      stats = addUsageTime(stats, "youtube.com", 600, at(day, 9));
    }
    stats = addUsageTime(stats, "youtube.com", 300, at(10, 10));
    const obs = computeUsageObservation(stats, NOW);
    expect(obs.todaySeconds).toBe(300);
    expect(obs).not.toHaveProperty("baselineSeconds");
  });

  it("handles a fresh user with no data", () => {
    const obs = computeUsageObservation({}, NOW);
    expect(obs.todaySeconds).toBe(0);
    expect(obs.topTargets).toEqual([]);
  });
});

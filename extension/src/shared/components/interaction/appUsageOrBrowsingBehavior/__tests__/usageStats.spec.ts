import {
  addUsageTime,
  MAX_USAGE_STAT_DAYS,
  UsageStatsByDate,
} from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageStats";

// 2024-03-10 at 14:30 local time.
const at = (h: number, day = 10): number =>
  new Date(2024, 2, day, h, 30, 0).getTime();

describe("addUsageTime", () => {
  it("accrues seconds into today's perSite and the current hour bucket", () => {
    const stats = addUsageTime({}, "youtube.com", 40, at(14));
    const today = stats["2024-03-10"];
    expect(today.perSite["youtube.com"]).toBe(40);
    expect(today.byHour[14]).toBe(40);
    expect(today.byHour.reduce((a, b) => a + b, 0)).toBe(40);
  });

  it("adds onto existing host + hour totals", () => {
    let stats: UsageStatsByDate = addUsageTime({}, "youtube.com", 40, at(14));
    stats = addUsageTime(stats, "youtube.com", 20, at(14));
    stats = addUsageTime(stats, "reddit.com", 10, at(15));
    const today = stats["2024-03-10"];
    expect(today.perSite["youtube.com"]).toBe(60);
    expect(today.perSite["reddit.com"]).toBe(10);
    expect(today.byHour[14]).toBe(60);
    expect(today.byHour[15]).toBe(10);
  });

  it("ignores non-positive or empty input", () => {
    expect(addUsageTime({}, "youtube.com", 0, at(14))).toEqual({});
    expect(addUsageTime({}, "youtube.com", -5, at(14))).toEqual({});
    expect(addUsageTime({}, "", 5, at(14))).toEqual({});
  });

  it("prunes to the most recent days", () => {
    const lastDay = MAX_USAGE_STAT_DAYS + 5;
    let stats: UsageStatsByDate = {};
    // Write one second per day across more than the retention window.
    for (let d = 1; d <= lastDay; d++) {
      stats = addUsageTime(stats, "youtube.com", 1, at(14, d));
    }
    const keys = Object.keys(stats).sort();
    const isoOf = (day: number): string => {
      const date = new Date(2024, 2, day, 14, 30, 0);
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${date.getFullYear()}-${m}-${dd}`;
    };
    expect(keys.length).toBe(MAX_USAGE_STAT_DAYS);
    // Newest kept, oldest dropped.
    expect(keys[keys.length - 1]).toBe(isoOf(lastDay));
    expect(stats[isoOf(1)]).toBeUndefined();
    expect(stats[isoOf(lastDay - MAX_USAGE_STAT_DAYS + 1)]).toBeDefined();
  });
});

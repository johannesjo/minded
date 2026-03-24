import {
  isToday,
  isYesterday,
  hasHappenedInLastXDay,
  isThisWeek,
} from "../isToday";
import { mockDate } from "@src/test-utils/mockHelpers";

describe("isToday", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns true for current date timestamp", () => {
    mockDate("2024-01-15T12:00:00");
    const todayTS = new Date("2024-01-15T08:00:00").getTime();
    expect(isToday(todayTS)).toBe(true);
  });

  it("returns true for Date object of today", () => {
    mockDate("2024-01-15T12:00:00");
    const today = new Date("2024-01-15T18:00:00");
    expect(isToday(today)).toBe(true);
  });

  it("returns false for yesterday", () => {
    mockDate("2024-01-15T12:00:00");
    const yesterday = new Date("2024-01-14T12:00:00").getTime();
    expect(isToday(yesterday)).toBe(false);
  });

  it("returns false for tomorrow", () => {
    mockDate("2024-01-15T12:00:00");
    const tomorrow = new Date("2024-01-16T12:00:00").getTime();
    expect(isToday(tomorrow)).toBe(false);
  });

  it("returns false for invalid timestamp (0)", () => {
    mockDate("2024-01-15T12:00:00");
    expect(isToday(0)).toBe(false);
  });

  it("handles different times on same day", () => {
    mockDate("2024-01-15T23:59:59");
    const earlyMorning = new Date("2024-01-15T00:01:00").getTime();
    expect(isToday(earlyMorning)).toBe(true);
  });
});

describe("isYesterday", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns true for yesterday's timestamp", () => {
    mockDate("2024-01-15T12:00:00");
    const yesterday = new Date("2024-01-14T12:00:00").getTime();
    expect(isYesterday(yesterday)).toBe(true);
  });

  it("returns false for today", () => {
    mockDate("2024-01-15T12:00:00");
    const today = new Date("2024-01-15T12:00:00").getTime();
    expect(isYesterday(today)).toBe(false);
  });

  it("returns false for two days ago", () => {
    mockDate("2024-01-15T12:00:00");
    const twoDaysAgo = new Date("2024-01-13T12:00:00").getTime();
    expect(isYesterday(twoDaysAgo)).toBe(false);
  });

  it("throws for invalid date", () => {
    expect(() => isYesterday(0)).toThrow("Invalid date passed");
  });
});

describe("hasHappenedInLastXDay", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns true for date within range", () => {
    mockDate("2024-01-15T12:00:00");
    const twoDaysAgo = new Date("2024-01-13T12:00:00").getTime();
    expect(hasHappenedInLastXDay(twoDaysAgo, 3)).toBe(true);
  });

  it("returns false for date outside range", () => {
    mockDate("2024-01-15T12:00:00");
    const fiveDaysAgo = new Date("2024-01-10T12:00:00").getTime();
    expect(hasHappenedInLastXDay(fiveDaysAgo, 3)).toBe(false);
  });

  it("returns true for today with daysAgo=1", () => {
    mockDate("2024-01-15T12:00:00");
    const today = new Date("2024-01-15T06:00:00").getTime();
    expect(hasHappenedInLastXDay(today, 1)).toBe(true);
  });

  it("handles boundary exactly at daysAgo", () => {
    mockDate("2024-01-15T12:00:00");
    const exactlyTwoDaysAgo = new Date("2024-01-13T12:00:00").getTime();
    expect(hasHappenedInLastXDay(exactlyTwoDaysAgo, 2)).toBe(true);
  });
});

describe("isThisWeek", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns true for same week timestamp", () => {
    mockDate("2024-01-15T12:00:00"); // Monday
    const sameWeek = new Date("2024-01-17T12:00:00").getTime(); // Wednesday
    expect(isThisWeek(sameWeek)).toBe(true);
  });

  it("returns true for Date object in same week", () => {
    mockDate("2024-01-15T12:00:00"); // Monday
    const sameWeek = new Date("2024-01-19T12:00:00"); // Friday (same week)
    expect(isThisWeek(sameWeek)).toBe(true);
  });

  it("returns false for previous Sunday (ISO week starts Monday)", () => {
    mockDate("2024-01-15T12:00:00"); // Monday Jan 15
    const prevSunday = new Date("2024-01-14T12:00:00"); // Sunday Jan 14 (previous week)
    expect(isThisWeek(prevSunday)).toBe(false);
  });

  it("returns false for last week", () => {
    mockDate("2024-01-15T12:00:00"); // Monday Jan 15
    const lastWeek = new Date("2024-01-08T12:00:00").getTime(); // Monday Jan 8
    expect(isThisWeek(lastWeek)).toBe(false);
  });

  it("returns false for next week", () => {
    mockDate("2024-01-15T12:00:00");
    const nextWeek = new Date("2024-01-22T12:00:00").getTime();
    expect(isThisWeek(nextWeek)).toBe(false);
  });

  it("throws for invalid date", () => {
    expect(() => isThisWeek(0)).toThrow("Invalid date passed");
  });

  it("handles year boundary correctly (Dec 30 Mon -> Jan 1 Wed same week)", () => {
    mockDate("2025-01-01T12:00:00"); // Wednesday Jan 1 2025
    const dec30 = new Date("2024-12-30T12:00:00").getTime(); // Monday Dec 30 2024 (same week)
    expect(isThisWeek(dec30)).toBe(true);
  });

  it("returns false for same week number in different year", () => {
    mockDate("2025-01-15T12:00:00"); // Wed Jan 15 2025
    const lastYear = new Date("2024-01-15T12:00:00").getTime(); // Mon Jan 15 2024
    expect(isThisWeek(lastYear)).toBe(false);
  });
});

import { getIsoDate } from "../getIsoDate";

describe("getIsoDate", () => {
  it("returns YYYY-MM-DD format for a given date", () => {
    const date = new Date(2024, 0, 15, 10, 30, 0);
    expect(getIsoDate(date)).toBe("2024-01-15");
  });

  it("handles single digit month", () => {
    const date = new Date(2024, 0, 5, 10, 30, 0);
    expect(getIsoDate(date)).toBe("2024-01-05");
  });

  it("handles single digit day", () => {
    const date = new Date(2024, 11, 1, 10, 30, 0);
    expect(getIsoDate(date)).toBe("2024-12-01");
  });

  it("handles year boundaries", () => {
    const date = new Date(2024, 11, 31, 23, 59, 59); // Dec 31 2024, 23:59:59 local
    expect(getIsoDate(date)).toBe("2024-12-31");
  });

  it("handles leap year date", () => {
    const date = new Date(2024, 1, 29, 10, 30, 0);
    expect(getIsoDate(date)).toBe("2024-02-29");
  });

  it("returns local date, not UTC date, near midnight", () => {
    // Create a date at 00:30 local time on Jan 15
    const nearMidnight = new Date(2024, 0, 15, 0, 30, 0);
    expect(getIsoDate(nearMidnight)).toBe("2024-01-15");
  });

  it("returns local date at 23:59 local time", () => {
    const lateNight = new Date(2024, 0, 15, 23, 59, 59);
    expect(getIsoDate(lateNight)).toBe("2024-01-15");
  });
});

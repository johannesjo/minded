import { getIsoDate } from "../getIsoDate";

describe("getIsoDate", () => {
  it("returns YYYY-MM-DD format for a given date", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    expect(getIsoDate(date)).toBe("2024-01-15");
  });

  it("handles single digit month", () => {
    const date = new Date("2024-01-05T10:30:00Z");
    expect(getIsoDate(date)).toBe("2024-01-05");
  });

  it("handles single digit day", () => {
    const date = new Date("2024-12-01T10:30:00Z");
    expect(getIsoDate(date)).toBe("2024-12-01");
  });

  it("handles year boundaries", () => {
    const date = new Date("2024-12-31T23:59:59Z");
    expect(getIsoDate(date)).toBe("2024-12-31");
  });

  it("handles leap year date", () => {
    const date = new Date("2024-02-29T10:30:00Z");
    expect(getIsoDate(date)).toBe("2024-02-29");
  });
});

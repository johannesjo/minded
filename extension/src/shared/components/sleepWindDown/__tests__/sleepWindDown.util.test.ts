import { resolveNightId } from "../sleepWindDown.util";
import { SleepWindDownCfg } from "@src/dataInterface/syncData";

const everyDay22to07: SleepWindDownCfg = {
  enabled: true,
  days: {
    0: { start: "22:00", end: "07:00" },
    1: { start: "22:00", end: "07:00" },
    2: { start: "22:00", end: "07:00" },
    3: { start: "22:00", end: "07:00" },
    4: { start: "22:00", end: "07:00" },
    5: { start: "22:00", end: "07:00" },
    6: { start: "22:00", end: "07:00" },
  },
};

describe("resolveNightId", () => {
  it("returns null when disabled", () => {
    const cfg = { ...everyDay22to07, enabled: false };
    const at = new Date(2024, 0, 15, 23, 0);
    expect(resolveNightId(cfg, at)).toBeNull();
  });

  it("returns today for an evening moment after bedtime", () => {
    // Mon 2024-01-15 23:00 local
    const at = new Date(2024, 0, 15, 23, 0);
    expect(resolveNightId(everyDay22to07, at)).toBe("2024-01-15");
  });

  it("returns yesterday for an early-morning moment before wake", () => {
    // Tue 2024-01-16 02:00 local — still within Monday's wind-down
    const at = new Date(2024, 0, 16, 2, 0);
    expect(resolveNightId(everyDay22to07, at)).toBe("2024-01-15");
  });

  it("returns null at noon", () => {
    const at = new Date(2024, 0, 15, 12, 0);
    expect(resolveNightId(everyDay22to07, at)).toBeNull();
  });

  it("returns null right at wake time", () => {
    const at = new Date(2024, 0, 16, 7, 0);
    expect(resolveNightId(everyDay22to07, at)).toBeNull();
  });

  it("returns today right at bedtime", () => {
    const at = new Date(2024, 0, 15, 22, 0);
    expect(resolveNightId(everyDay22to07, at)).toBe("2024-01-15");
  });

  it("respects disabled days", () => {
    // Disable Monday (index 1)
    const cfg: SleepWindDownCfg = {
      ...everyDay22to07,
      days: { ...everyDay22to07.days, 1: null },
    };
    // Mon 2024-01-15 23:00 — Monday's window disabled
    expect(resolveNightId(cfg, new Date(2024, 0, 15, 23, 0))).toBeNull();
    // Tue 2024-01-16 02:00 — looks back to Monday, which is disabled
    expect(resolveNightId(cfg, new Date(2024, 0, 16, 2, 0))).toBeNull();
  });

  it("supports same-day windows that don't cross midnight", () => {
    const cfg: SleepWindDownCfg = {
      enabled: true,
      days: { 1: { start: "20:00", end: "23:00" } },
    };
    // Mon 2024-01-15 21:00 — inside
    expect(resolveNightId(cfg, new Date(2024, 0, 15, 21, 0))).toBe(
      "2024-01-15",
    );
    // Mon 2024-01-15 23:30 — outside
    expect(resolveNightId(cfg, new Date(2024, 0, 15, 23, 30))).toBeNull();
  });
});

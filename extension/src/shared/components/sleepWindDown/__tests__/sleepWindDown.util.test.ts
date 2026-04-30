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

  it("treats start === end as no window (zero-width)", () => {
    const cfg: SleepWindDownCfg = {
      enabled: true,
      days: { 1: { start: "22:00", end: "22:00" } },
    };
    expect(resolveNightId(cfg, new Date(2024, 0, 15, 22, 30))).toBeNull();
    expect(resolveNightId(cfg, new Date(2024, 0, 15, 9, 0))).toBeNull();
    expect(resolveNightId(cfg, new Date(2024, 0, 16, 3, 0))).toBeNull();
  });

  it("ignores malformed time strings", () => {
    const cfg: SleepWindDownCfg = {
      enabled: true,
      days: {
        1: { start: "abc", end: "07:00" },
        2: { start: "25:00", end: "07:00" },
        3: { start: "22:00", end: "07:5" },
      },
    };
    // Mon evening — start is malformed
    expect(resolveNightId(cfg, new Date(2024, 0, 15, 23, 0))).toBeNull();
    // Tue evening — start hour out of range
    expect(resolveNightId(cfg, new Date(2024, 0, 16, 23, 0))).toBeNull();
    // Wed evening — end is malformed
    expect(resolveNightId(cfg, new Date(2024, 0, 17, 23, 0))).toBeNull();
  });

  it("handles dismiss-at-23:50 / unlock-at-00:05 producing same nightId", () => {
    // This is the cross-midnight integrity check: the value the dismiss
    // button writes at 23:50 must equal the value the receiver computes
    // at 00:05 the next morning, otherwise the dismiss is silently lost.
    const dismissAt = new Date(2024, 0, 15, 23, 50);
    const unlockAt = new Date(2024, 0, 16, 0, 5);
    expect(resolveNightId(everyDay22to07, dismissAt)).toBe("2024-01-15");
    expect(resolveNightId(everyDay22to07, unlockAt)).toBe("2024-01-15");
  });
});

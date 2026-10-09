import { moonPhaseAt } from "./lunarPhase";

// Known phases (UTC): the mean-cycle model is within ~14h of these, which at
// the companion's size is invisible - hence the loose bounds.
describe("moonPhaseAt", () => {
  it.each([
    ["2024-04-08T18:21:00Z"], // total solar eclipse
    ["2025-03-29T10:58:00Z"],
    ["2026-10-10T15:50:00Z"],
  ])("is new at the new moon of %s", (iso) => {
    expect(moonPhaseAt(new Date(iso)).illumination).toBeLessThan(0.03);
  });

  it.each([
    ["2024-04-23T23:49:00Z"],
    ["2025-01-13T22:27:00Z"],
    ["2025-09-07T18:09:00Z"], // total lunar eclipse
  ])("is full at the full moon of %s", (iso) => {
    expect(moonPhaseAt(new Date(iso)).illumination).toBeGreaterThan(0.97);
  });

  it("is half lit and waxing at a first quarter", () => {
    const p = moonPhaseAt(new Date("2024-04-15T19:13:00Z"));
    expect(p.illumination).toBeGreaterThan(0.4);
    expect(p.illumination).toBeLessThan(0.6);
    expect(p.isWaxing).toBe(true);
  });

  it("is half lit and waning at a last quarter", () => {
    const p = moonPhaseAt(new Date("2024-05-01T11:27:00Z"));
    expect(p.illumination).toBeGreaterThan(0.4);
    expect(p.illumination).toBeLessThan(0.6);
    expect(p.isWaxing).toBe(false);
  });

  it("handles dates before the reference epoch", () => {
    // 1999-12-22 full moon.
    expect(
      moonPhaseAt(new Date("1999-12-22T17:31:00Z")).illumination,
    ).toBeGreaterThan(0.97);
  });
});

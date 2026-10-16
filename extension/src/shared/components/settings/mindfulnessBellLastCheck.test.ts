import { bellLastCheckLabel } from "./mindfulnessBellLastCheck";

describe("bellLastCheckLabel", () => {
  const now = new Date(2026, 9, 16, 18, 0);
  const at = new Date(2026, 9, 16, 14, 5).getTime();

  it("is empty until a bell has been due", () => {
    expect(bellLastCheckLabel("", now)).toBeUndefined();
    expect(bellLastCheckLabel(null, now)).toBeUndefined();
    expect(bellLastCheckLabel("not json", now)).toBeUndefined();
    expect(bellLastCheckLabel('{"atMs":1}', now)).toBeUndefined();
  });

  it("says a bell rang", () => {
    const label = bellLastCheckLabel(
      JSON.stringify({ atMs: at, rang: true, reason: null }),
      now,
    );
    expect(label).toMatch(/^Last bell: today .*, rang$/);
  });

  it("says why a bell stayed quiet", () => {
    const label = bellLastCheckLabel(
      JSON.stringify({
        atMs: at,
        rang: false,
        reason: "a guarded app was open",
      }),
      now,
    );
    expect(label).toMatch(/stayed quiet - a guarded app was open$/);
  });

  it("names the day when it wasn't today", () => {
    const label = bellLastCheckLabel(
      JSON.stringify({ atMs: at, rang: true, reason: null }),
      new Date(2026, 9, 18, 9, 0),
    );
    expect(label).not.toMatch(/today/);
  });
});

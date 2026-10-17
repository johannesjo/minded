import {
  bellLastCheckLabel,
  bellLastUnlockLabel,
  bellTraceLabel,
} from "./mindfulnessBellLastCheck";

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

  it("names the sun it rang through", () => {
    const label = bellLastCheckLabel(
      JSON.stringify({
        atMs: at,
        rang: true,
        reason: null,
        through: "the Little Sun",
      }),
      now,
    );
    expect(label).toMatch(/rang through the Little Sun$/);
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

describe("bellLastUnlockLabel", () => {
  const now = new Date(2026, 9, 16, 18, 0);
  const at = new Date(2026, 9, 16, 14, 5).getTime();
  const next = new Date(2026, 9, 16, 15, 20).getTime();

  it("is empty when the native build can't tell", () => {
    expect(bellLastUnlockLabel(undefined, now)).toBeUndefined();
  });

  it("says when no unlock has reached the bell", () => {
    expect(bellLastUnlockLabel("", now)).toBe("No unlock seen yet");
    expect(bellLastUnlockLabel(null, now)).toBe("No unlock seen yet");
  });

  it("says when the bell read as off", () => {
    expect(
      bellLastUnlockLabel(
        JSON.stringify({ atMs: at, enabled: false, nextAtMs: null }),
        now,
      ),
    ).toMatch(/^Last unlock: today .*, the bell was off$/);
  });

  it("names the next bell window", () => {
    expect(
      bellLastUnlockLabel(
        JSON.stringify({ atMs: at, enabled: true, nextAtMs: next }),
        now,
      ),
    ).toMatch(/^Last unlock: today .*, next bell from .+$/);
  });

  it("says when no bell is left today", () => {
    expect(
      bellLastUnlockLabel(
        JSON.stringify({ atMs: at, enabled: true, nextAtMs: null }),
        now,
      ),
    ).toMatch(/no bell left today$/);
  });
});

describe("bellTraceLabel", () => {
  const now = new Date(2026, 9, 16, 18, 0);
  const at = new Date(2026, 9, 16, 14, 5).getTime();

  it("is empty when the native build can't trace", () => {
    expect(bellTraceLabel(undefined, now)).toBeUndefined();
  });

  it("says when nothing has been traced", () => {
    expect(bellTraceLabel("", now)).toBe("Trace: nothing yet");
  });

  it("lists each step, with a dash for steps that never ran, and the error", () => {
    const label = bellTraceLabel(
      JSON.stringify({ a11y: at, handOff: at, error: "check: Boom: no" }),
      now,
    );
    expect(label).toMatch(/a11y today /);
    expect(label).toMatch(/handOff today /);
    expect(label).toMatch(/check -/);
    expect(label).toMatch(/error: check: Boom: no$/);
  });
});

import {
  completionYAt,
  createSnapBack,
  glideOffsetAt,
  timedGlideHandoff,
} from "./sunRelease";
import { easeInOut } from "./sunAnimationUtils";

const runSnapBack = (
  displacement: { x: number; y: number },
  velocity: { x: number; y: number },
  reducedMotion = false,
  frameMs = 16,
) => {
  const step = createSnapBack(displacement, velocity, reducedMotion);
  const frames = [];
  for (let t = 0; t < 5000; t += frameMs) {
    const f = step(frameMs / 1000);
    frames.push(f);
    if (f.done) break;
  }
  return frames;
};

describe("createSnapBack", () => {
  it("comes home and stops", () => {
    const frames = runSnapBack({ x: 20, y: 80 }, { x: 0, y: 0 });
    const last = frames[frames.length - 1];
    expect(last.done).toBe(true);
    expect(frames.length * 16).toBeLessThan(1000);
    expect(Math.abs(last.offset.y)).toBeLessThan(0.3);
  });

  it("continues the release velocity on the first frame", () => {
    // Released 60px below home, still moving down at 600px/s.
    const [first] = runSnapBack({ x: 0, y: 60 }, { x: 0, y: 600 });
    expect(first.offset.y).toBeGreaterThan(60); // keeps going before turning
  });

  it("never passes home, even on a hard throw toward it", () => {
    const frames = runSnapBack({ x: 0, y: 90 }, { x: 0, y: -3000 });
    expect(Math.min(...frames.map((f) => f.offset.y))).toBeGreaterThanOrEqual(
      -1e-6,
    );
  });

  it("settles the look in step: 1 → 0, monotonic", () => {
    const frames = runSnapBack({ x: 0, y: 40 }, { x: 0, y: 0 });
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].look).toBeLessThanOrEqual(frames[i - 1].look);
    }
  });

  it("ignores the release velocity under reduced motion", () => {
    const [first] = runSnapBack({ x: 0, y: 60 }, { x: 0, y: 600 }, true);
    expect(first.offset.y).toBeLessThan(60); // straight home, no carry-on
  });
});

describe("glideOffsetAt", () => {
  const from = { x: 0, y: 100 };
  const target = { x: 0, y: 500 };

  it("is exactly the eased glide without a hand-off", () => {
    for (const p of [0, 0.25, 0.5, 0.9, 1]) {
      const { offset, eased } = glideOffsetAt(
        p,
        from,
        target,
        null,
        900,
        easeInOut,
      );
      expect(eased).toBe(easeInOut(p));
      expect(offset.y).toBeCloseTo(100 + 400 * easeInOut(p), 9);
    }
  });

  it("lands exactly on target at the glide's own duration", () => {
    const handoff = timedGlideHandoff(from, target, { x: 300, y: 1200 }, 900);
    const { offset, eased } = glideOffsetAt(
      1,
      from,
      target,
      handoff,
      900,
      easeInOut,
    );
    expect(offset).toEqual(target);
    expect(eased).toBe(1);
  });

  it("leaves with the release velocity", () => {
    const v = { x: 0, y: 800 };
    const handoff = timedGlideHandoff(from, target, v, 900);
    expect(handoff.y).toBe(800); // within the no-overshoot bound
    const dtMs = 0.01;
    const a = glideOffsetAt(0, from, target, handoff, 900, easeInOut).offset;
    const b = glideOffsetAt(
      dtMs / 900,
      from,
      target,
      handoff,
      900,
      easeInOut,
    ).offset;
    expect(((b.y - a.y) / dtMs) * 1000).toBeCloseTo(800, -1);
  });
});

describe("completionYAt", () => {
  it("leaves at the release speed and lands untouched", () => {
    const y0 = completionYAt(0, 50, -800, -150, 3000, easeInOut);
    const y1 = completionYAt(1e-5, 50, -800, -150, 3000, easeInOut);
    expect(y0).toBe(50);
    expect(((y1 - y0) / (1e-5 * 3000)) * 1000).toBeCloseTo(-150, 0);
    expect(completionYAt(1, 50, -800, -150, 3000, easeInOut)).toBe(-800);
  });

  it("matches the old eased exit with no velocity", () => {
    expect(completionYAt(0.3, 0, 900, 0, 3000, easeInOut)).toBeCloseTo(
      900 * easeInOut(0.3),
      9,
    );
  });
});

import {
  estimateVelocity,
  MAX_MOTION_SAMPLES,
  pushMotionSample,
  VELOCITY_STALE_END_MS,
  type MotionSample,
} from "./sunVelocity";

/** A disc moving at a constant vx, vy (px/s), sampled every frameMs. */
const track = (
  vx: number,
  vy: number,
  frameMs: number,
  frames: number,
): MotionSample[] => {
  let samples: MotionSample[] = [];
  for (let i = 0; i <= frames; i++) {
    const t = i * frameMs;
    samples = pushMotionSample(samples, {
      x: (vx * t) / 1000,
      y: (vy * t) / 1000,
      t,
    });
  }
  return samples;
};

describe("estimateVelocity", () => {
  it("recovers a steady drag's velocity", () => {
    const s = track(120, -900, 16, 20);
    const v = estimateVelocity(s, s[s.length - 1].t);
    expect(v.x).toBeCloseTo(120, 6);
    expect(v.y).toBeCloseTo(-900, 6);
  });

  it("holds up under a throttled WebView's coarse frames", () => {
    const s = track(0, 1500, 48, 6);
    expect(estimateVelocity(s, s[s.length - 1].t).y).toBeCloseTo(1500, 6);
  });

  it("smooths one late (jittered) event instead of spiking", () => {
    const s = track(0, -1000, 16, 10);
    // The last move arrives 8ms late but at its on-time position: a two-point
    // difference would read -500px/s; least squares stays close to -1000.
    const last = s[s.length - 1];
    s[s.length - 1] = { ...last, t: last.t + 8 };
    const v = estimateVelocity(s, last.t + 8);
    expect(v.y).toBeLessThan(-700);
    expect(v.y).toBeGreaterThan(-1000);
  });

  it("hands over nothing when the finger stopped before lifting", () => {
    const s = track(0, -1200, 16, 10);
    const lastT = s[s.length - 1].t;
    expect(estimateVelocity(s, lastT + VELOCITY_STALE_END_MS).y).toBe(0);
    // A short hesitation only fades it.
    const faded = estimateVelocity(s, lastT + 70).y;
    expect(faded).toBeLessThan(0);
    expect(faded).toBeGreaterThan(-1200);
  });

  it("ignores motion outside the window (a direction change)", () => {
    let s = track(0, 1000, 16, 10); // moving down...
    const t0 = s[s.length - 1].t;
    const y0 = s[s.length - 1].y;
    for (let i = 1; i <= 8; i++) {
      // ...then up at 400px/s for the last 128ms
      s = pushMotionSample(s, {
        x: 0,
        y: y0 - (400 * i * 16) / 1000,
        t: t0 + i * 16,
      });
    }
    const v = estimateVelocity(s, t0 + 128);
    expect(v.y).toBeCloseTo(-400, 0);
  });

  it("is zero with fewer than two samples", () => {
    expect(estimateVelocity([], 0)).toEqual({ x: 0, y: 0 });
    expect(estimateVelocity([{ x: 1, y: 1, t: 0 }], 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("pushMotionSample", () => {
  it("drops an unchanged position (the release flush)", () => {
    const s = pushMotionSample([{ x: 1, y: 2, t: 0 }], { x: 1, y: 2, t: 16 });
    expect(s).toHaveLength(1);
  });

  it("keeps a bounded history", () => {
    const s = track(0, 100, 16, 40);
    expect(s).toHaveLength(MAX_MOTION_SAMPLES);
  });
});

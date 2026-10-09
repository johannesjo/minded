import {
  clampEasedHandoff,
  clampTimedHandoffVelocity,
  createReleaseSpring,
  isSpringAtRest,
  MAX_HANDOFF_VELOCITY,
  stepCriticalSpring,
  SUN_SPRING_MAX_STIFFEN,
  SUN_SPRING_OMEGA,
  timedSpringBasis,
  velocityHandoffTerm,
  type SpringAxis,
} from "./sunSpring";

// Tiny tolerance for "never passes the rest": float noise only.
const EPS = 1e-6;

/** Run a spring to rest at a fixed frame time; returns the trajectory. */
const run = (
  start: SpringAxis,
  omega: number,
  frameMs: number,
  maxMs = 5000,
): { xs: number[]; restMs: number | null } => {
  let s = start;
  const xs = [s.x];
  for (let t = frameMs; t <= maxMs; t += frameMs) {
    s = stepCriticalSpring(s, omega, frameMs / 1000);
    xs.push(s.x);
    if (isSpringAtRest(s)) return { xs, restMs: t };
  }
  return { xs, restMs: null };
};

describe("stepCriticalSpring", () => {
  it("converges to rest from a plain displacement", () => {
    const { restMs, xs } = run({ x: 120, v: 0 }, SUN_SPRING_OMEGA, 16);
    expect(restMs).not.toBeNull();
    // Same rhythm the old 600ms eased snap-back had: home well inside a second.
    expect(restMs!).toBeLessThan(900);
    expect(Math.abs(xs[xs.length - 1])).toBeLessThan(0.3);
  });

  it("never passes the rest from a displacement alone (critical damping)", () => {
    const { xs } = run({ x: 300, v: 0 }, SUN_SPRING_OMEGA, 16);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-EPS);
    // ...and moves monotonically home: no wobble.
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] + EPS);
    }
  });

  it("is frame-rate independent (exact closed form)", () => {
    // 60fps vs a 4x-throttled WebView's ~64ms frames land on the same point.
    let a: SpringAxis = { x: 80, v: -400 };
    let b: SpringAxis = { x: 80, v: -400 };
    for (let i = 0; i < 64; i++) a = stepCriticalSpring(a, 14, 0.004);
    b = stepCriticalSpring(b, 14, 0.256);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.v).toBeCloseTo(b.v, 6);
  });

  it("is a no-op for a zero or negative step", () => {
    const s = { x: 10, v: 5 };
    expect(stepCriticalSpring(s, 14, 0)).toBe(s);
    expect(stepCriticalSpring(s, 14, -0.01)).toBe(s);
  });
});

describe("createReleaseSpring", () => {
  it("hands the release velocity on unchanged when it can't overshoot", () => {
    // Moving away from the rest: the disc carries on, slows, comes home.
    const s = createReleaseSpring({ x: 0, y: 60 }, { x: 0, y: 500 });
    expect(s.omega).toBe(SUN_SPRING_OMEGA);
    expect(s.y.v).toBe(500);
    // Gently toward it: below ω·|x|, also untouched.
    const t = createReleaseSpring({ x: 0, y: 60 }, { x: 0, y: -300 });
    expect(t.y.v).toBe(-300);
  });

  it("stiffens to absorb a fast throw home instead of overshooting", () => {
    // 60px out, thrown home at 1500px/s: ω·x = 840 < 1500.
    const s = createReleaseSpring({ x: 0, y: 60 }, { x: 0, y: -1500 });
    expect(s.omega).toBeCloseTo(25, 6);
    expect(s.y.v).toBe(-1500); // velocity continuity kept
    const { xs } = run(s.y, s.omega, 16);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-EPS);
  });

  it("clamps (rather than overshoots) past the stiffening cap", () => {
    const s = createReleaseSpring({ x: 0, y: 10 }, { x: 0, y: -2400 });
    expect(s.omega).toBe(SUN_SPRING_OMEGA * SUN_SPRING_MAX_STIFFEN);
    expect(s.y.v).toBeCloseTo(-s.omega * 10, 6);
    const { xs } = run(s.y, s.omega, 16);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-EPS);
  });

  it("never overshoots across a grid of releases", () => {
    for (const x of [-200, -40, -3, 3, 40, 200]) {
      for (const v of [-4000, -1200, -200, 0, 200, 1200, 4000]) {
        const s = createReleaseSpring({ x, y: 0 }, { x: v, y: 0 });
        const { xs, restMs } = run(s.x, s.omega, 8);
        expect(restMs).not.toBeNull();
        const crossed = xs.map((p) => p * Math.sign(x));
        expect(Math.min(...crossed)).toBeGreaterThanOrEqual(-EPS);
      }
    }
  });

  it("caps an extreme flick", () => {
    const s = createReleaseSpring({ x: 0, y: 50 }, { x: 0, y: 9000 });
    expect(s.y.v).toBe(MAX_HANDOFF_VELOCITY);
  });

  it("keeps one ω for both axes so the 2D path stays straight", () => {
    const s = createReleaseSpring({ x: 30, y: 60 }, { x: -1000, y: -100 });
    // x approach 1000/30 ≈ 33 > 14 → stiffened for both axes.
    expect(s.omega).toBeCloseTo(1000 / 30, 6);
  });

  it("carries no momentum under reduced motion", () => {
    const s = createReleaseSpring(
      { x: 20, y: 60 },
      { x: 800, y: -900 },
      { reducedMotion: true },
    );
    expect(s.x.v).toBe(0);
    expect(s.y.v).toBe(0);
    expect(s.omega).toBe(SUN_SPRING_OMEGA);
    const { xs } = run(s.y, s.omega, 16);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] + EPS);
    }
  });
});

describe("timedSpringBasis", () => {
  const T = 0.9; // s - COMPANION_GLIDE_MS
  const displacementAt = (tau: number, x0: number, v0: number) => {
    const { p, q } = timedSpringBasis(tau);
    return x0 * p + v0 * T * q;
  };

  it("starts at the release point and lands exactly at T", () => {
    expect(timedSpringBasis(0)).toEqual({ p: 1, q: 0 });
    expect(timedSpringBasis(1)).toEqual({ p: 0, q: 0 });
    const almost = timedSpringBasis(1 - 1e-9);
    expect(Math.abs(almost.p)).toBeLessThan(1e-6);
    expect(Math.abs(almost.q)).toBeLessThan(1e-6);
  });

  it("leaves with the release velocity (velocity hand-off)", () => {
    const h = 1e-6;
    const x0 = 200;
    const v0 = -350; // px/s
    const slope = (displacementAt(h, x0, v0) - displacementAt(0, x0, v0)) / h;
    // d(displacement)/dτ = v0·T at τ = 0
    expect(slope / T).toBeCloseTo(v0, 0);
  });

  it("arrives at rest (zero end velocity)", () => {
    const h = 1e-5;
    const end = (displacementAt(1 - h, 300, 600) - 0) / h;
    expect(Math.abs(end)).toBeLessThan(1e-2);
  });

  it("never passes the target within the clamped hand-off", () => {
    for (const x0 of [-400, -50, 50, 400]) {
      for (const v of [-5000, -1500, -300, 0, 300, 1500, 5000]) {
        const v0 = clampTimedHandoffVelocity(x0, v, T * 1000);
        let min = Infinity;
        for (let i = 0; i <= 1000; i++) {
          min = Math.min(min, displacementAt(i / 1000, x0, v0) * Math.sign(x0));
        }
        // Tiny epsilon: well under a pixel even on a 400px glide.
        expect(min).toBeGreaterThanOrEqual(-0.01);
      }
    }
  });

  it("is free of the old eased glide's dead start: moving from frame one", () => {
    // A zero-velocity timed spring still moves sooner than easeInOut would.
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    expect(1 - timedSpringBasis(0.1).p).toBeGreaterThan(easeInOut(0.1));
  });
});

describe("velocityHandoffTerm", () => {
  it("adds momentum at the start and vanishes at both ends", () => {
    expect(velocityHandoffTerm(0)).toBe(0);
    expect(velocityHandoffTerm(1)).toBe(0);
    const h = 1e-6;
    expect(velocityHandoffTerm(h) / h).toBeCloseTo(1, 4);
  });

  it("never carries an eased glide past its target once clamped", () => {
    const easeInOut = (t: number) =>
      t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const distance = 500;
    const m = clampEasedHandoff(10_000, distance);
    expect(m).toBe(1000);
    for (let i = 0; i <= 1000; i++) {
      const tau = i / 1000;
      const y = distance * easeInOut(tau) + m * velocityHandoffTerm(tau);
      expect(y).toBeLessThanOrEqual(distance + EPS);
    }
  });
});

import { readFileSync } from "fs";
import { resolve } from "path";

const component = readFileSync(
  resolve(__dirname, "../QuickBreath.tsx"),
  "utf8",
);

/**
 * The code alone. This file's assertions are about what the component *does*,
 * and it is a heavily commented one - matching against the raw text would pin
 * prose as tightly as behaviour and break on every wording pass.
 */
const code = component
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
  .replace(/\/\/[^\n]*/g, " ")
  .replace(/\s+/g, " ");

const routes = readFileSync(
  resolve(__dirname, "../../../RouteCmp.tsx"),
  "utf8",
).replace(/\s+/g, " ");

describe("the guided quick breath", () => {
  it("hands the breath to the one shell sun rather than drawing a second disc", () => {
    // "There is only ever one sun": the disc that breathes here is the same one
    // resting on the dashboard's bottom bar, glided into its breathing role.
    expect(code).toContain('setSunRole("breathing")');
    expect(code).not.toContain("BreathSun");
  });

  it("reuses the intervention pause, so copy and disc share one clock", () => {
    // StrongFrictionBreathPause reads the sun's published breath origin, which
    // is what keeps "Breathe in / Hold / Breathe out" on the disc's beats.
    expect(code).toMatch(
      /<StrongFrictionBreathPause seconds=\{STRONG_FRICTION_BREATH_PAUSE_SECONDS\}/,
    );
    // Without this the whole surface is inert: a finished breath would spend
    // nothing and never return home, and every other assertion here still
    // passes. The wiring is the behaviour.
    expect(code).toContain("onComplete={finish}");
  });

  it("starts from a fresh origin and hands the disc back on the way out", () => {
    // A stale origin would have the copy mid-exhale before the disc arrives.
    expect(code).toMatch(
      /onMount\(\(\) => \{ setBreathStartedAt\(undefined\); setSunRole\("breathing"\); \}\)/,
    );
    expect(code).toMatch(
      /onCleanup\(\(\) => \{[^}]*setSunRole\("companion"\); setBreathStartedAt\(undefined\);/,
    );
  });

  it("spends the day's invitation only on a finished breath", () => {
    // Leaving early marks nothing - the card comes back, which is the honest
    // behaviour for a practice that was not taken.
    expect(code).toMatch(
      /const finish = \(\) => \{ if \(hasLeft\) return; setDailyQuestionsDoneForToday\(mode\);/,
    );
    expect(code).not.toMatch(/onCancel=\{[^}]*setDailyQuestionsDoneForToday/);
  });

  it("cannot be completed by a breath that finishes while the page is leaving", () => {
    // navigate() is intercepted by the global page-fade guard, so this component
    // and its breath clock stay mounted through the fade. Without the flag, a
    // cancel in the breath's last moments still fires onComplete on the way out
    // and spends the day - the one thing leaving is supposed not to do.
    expect(code).toMatch(
      /const leave = \(\) => \{ hasLeft = true; navigate\("\/"\); \};/,
    );
    expect(code).toContain("onCancel={leave}");
    // The back arrow unmounts rather than routing through `leave`, so cleanup
    // has to close the same hole.
    expect(code).toMatch(/onCleanup\(\(\) => \{ hasLeft = true;/);
  });

  it("marks the half of the day the breath was begun in, not the one it ended in", () => {
    // A breath begun at 23:59:50 finishes under the next day's clock, where
    // getDailyQuestionsMode() reads "Morning" again - marking an evening as a
    // morning and spending the coming morning's card before it appears.
    expect(code).toMatch(/const mode = getDailyQuestionsMode\(\);/);
    expect(code).toContain("setDailyQuestionsDoneForToday(mode)");
    expect(code).not.toContain(
      "setDailyQuestionsDoneForToday(getDailyQuestionsMode())",
    );
  });

  it("lets the last exhale land before the page changes", () => {
    // Never a hard cut: the breath settles, then the route transition fades.
    expect(code).toContain(
      't0 = setTimeout(() => navigate("/"), AFTER_BREATH_WAIT_MS);',
    );
    // The timer is cleared on the way out, so leaving mid-breath can't later
    // yank whatever page the user moved on to back to the dashboard.
    expect(code).toMatch(
      /onCleanup\(\(\) => \{[^}]*window\.clearTimeout\(t0\);/,
    );
  });

  it("is a real page, so the global bottom bar offers its back arrow", () => {
    expect(routes).toContain(
      '<Route path="/quickBreath" component={QuickBreath} />',
    );
  });
});

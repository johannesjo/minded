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

const styles = readFileSync(
  resolve(__dirname, "../QuickBreath.module.scss"),
  "utf8",
);

const routes = readFileSync(
  resolve(__dirname, "../../../RouteCmp.tsx"),
  "utf8",
).replace(/\s+/g, " ");

/**
 * NOTE ON WHAT THIS FILE CAN AND CANNOT CATCH. These are source-text
 * assertions: the component is read as a string, never rendered (the suite runs
 * in `node`, with no DOM and no Solid test renderer). So they pin wiring and
 * spelling, and a mutant that replaces the whole component with `() => null`
 * would pass every one of them. Treat them as a guard on the decisions
 * documented here, not as evidence the screen works.
 */
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
      /const finish = \(\) => \{ if \(hasLeft\) return;[^;]*hasLeft = true; setDailyQuestionsDoneForToday\(mode, startedAtTS\);/,
    );
    expect(code).not.toMatch(/onCancel=\{[^}]*setDailyQuestionsDoneForToday/);
  });

  it("cannot be completed by a breath that finishes while the page is leaving", () => {
    // navigate() is intercepted by the global page-fade guard, so this component
    // and its breath clock stay mounted for ~240ms after the user asks to
    // leave. Without a guard, a cancel in the breath's last moments still fires
    // onComplete on the way out and spends the day.
    //
    // It must be `useBeforeLeave`, not a flag set in the cancel handler: the
    // bottom bar's back arrow leaves via its own navigate("/") and never
    // touches this component's handlers, so a cancel-only flag left the hole
    // open on the exit this route actually advertises. onCleanup is too late
    // for the same job - the breath clock registers its cleanup after this
    // component's and Solid runs them in reverse, so the timer it would guard
    // is already cancelled by then.
    expect(code).toMatch(/useBeforeLeave\(\(\) => \{ hasLeft = true; \}\)/);
    expect(code).toMatch(/const finish = \(\) => \{ if \(hasLeft\) return;/);
  });

  it("does not leave itself re-enterable by the back gesture", () => {
    // This route shows itself out, so the user never chose to return to the
    // dashboard. Pushing would put it under the next back press - starting a
    // second breath from a gesture that meant "leave".
    expect(code).toContain('navigate("/", { replace: true })');
  });

  it("keeps the settle a settle", () => {
    // The test above pins the spelling; this pins the only thing that makes it
    // true. At 0 the "settle" is the hard cut it exists to avoid. Read from the
    // source rather than imported: this suite runs in `node`, where importing
    // the component would drag in JSX, Solid and a .scss module.
    const declared = component.match(/AFTER_BREATH_WAIT_MS\s*=\s*(\d+)/)?.[1];
    expect(Number(declared)).toBeGreaterThan(0);
  });

  it("marks the day the breath was begun in, not the one it ended in", () => {
    // Two independent halves of the same bug. The *mode* must be the card's,
    // not a second reading this route takes ~240ms later behind the page fade
    // (revealed at 19:59 as Morning, mounting at 20:00 as Evening). And the
    // *timestamp* must be the card's too: setDailyQuestionsDoneForToday
    // defaults to Date.now(), so a breath begun at 23:59:50 and finished at
    // 00:00:02 would stamp the new day and suppress a card nobody has seen.
    expect(code).toContain("navState().mode ?? getDailyQuestionsMode()");
    expect(code).toContain("navState().startedAtTS ?? Date.now()");
    expect(code).toContain("setDailyQuestionsDoneForToday(mode, startedAtTS)");
  });

  it("lets the last exhale land before the page changes", () => {
    // Never a hard cut: the breath settles, then the route transition fades.
    expect(code).toMatch(
      /t0 = setTimeout\( \(\) => navigate\("\/", \{ replace: true \}\), AFTER_BREATH_WAIT_MS, \);/,
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

  it("centres the cue in the same frame the disc is anchored to", () => {
    // sunBreatheSettle anchors the disc to a ratio of the VIEWPORT, while the
    // gap reserved for it is centred in this page. Centre the page in <main>
    // instead and the two frames differ by the bottom bar plus the top safe
    // area - the disc lands ~40px low in its own space on a phone, halo into
    // the cue. The intervention avoids this by centring in a fixed inset-0
    // overlay; so does this.
    expect(styles).toMatch(/\.wrapper\s*\{[^}]*position: fixed;[^}]*inset: 0;/);
    expect(styles).toMatch(/\.wrapper\s*\{[^}]*justify-content: center;/);
    // The bar sets z-index 1 on its own row, so staying below it keeps the back
    // arrow tappable through this full-screen layer.
    expect(styles).toMatch(/\.wrapper\s*\{[^}]*z-index: 0;[^}]*/);
    expect(styles).toMatch(/\.wrapper\s*\{[^}]*pointer-events: none;/);
  });
});

import { readFileSync } from "fs";
import { resolve } from "path";

const component = readFileSync(
  resolve(__dirname, "../BreathInteraction.tsx"),
  "utf8",
);
const normalized = component.replace(/\s+/g, " ");
const common = readFileSync(
  resolve(__dirname, "../../InteractionCommon.tsx"),
  "utf8",
).replace(/\s+/g, " ");

describe("the BREATH intervention", () => {
  it("invites first - the breath starts on a tap, never on mount", () => {
    // Auto-starting would settle the sun (the universal way out) for twelve
    // seconds the user never agreed to - the forced shape minded refuses.
    expect(normalized).not.toMatch(/onMount/);
    expect(normalized).toMatch(
      /<Btn voice style=\{\{ "margin-top": "24px" \}\} onClick=\{begin\}>\s*breathe\s*<\/Btn>/,
    );
    expect(normalized).toContain("Take one slow breath.");
  });

  it("reuses the strong-friction pause wholesale - no second breath implementation", () => {
    // The line docs/reflective-companion-concept.md holds: a new doorway into
    // the existing machinery, never another breathing disc or pattern.
    expect(normalized).toMatch(
      /<StrongFrictionBreathPause seconds=\{STRONG_FRICTION_BREATH_PAUSE_SECONDS\}/,
    );
    expect(normalized).not.toMatch(/BreathSun|SURF_WAVE_PATTERN/);
  });

  it("hands the disc back before the success beat, so the instructions get an interactive sun", () => {
    expect(normalized).toMatch(
      /const finish = \(\): void => \{ if \(hasFinished\) return; hasFinished = true; stopKeepAlive\(\); .*?props\.onSunBreathEnd\(\); props\.onSuccess\(\); \};/,
    );
  });

  it("treats cancel as leaving the breath, not the intervention", () => {
    // Back to the invitation with the sun interactive again - the sun remains
    // the way out of the intervention itself. No success, nothing marked.
    expect(normalized).toMatch(
      /const cancel = \(\): void => \{ if \(hasFinished\) return; stopKeepAlive\(\); props\.onCancelCountdown\(\); props\.onSunBreathEnd\(\); .*?setPhase\("invite"\); \};/,
    );
  });

  it("keeps the parent's auto-dismiss countdown at bay while the breath runs", () => {
    // The breath runs without pointer input; without this tick the intervention
    // could fade out mid-exhale (same job as urge surfing's wave tick).
    expect(normalized).toMatch(
      /keepAliveId = setInterval\(\(\) => onCancelCountdown\(\), KEEP_ALIVE_MS\);/,
    );
  });

  it("only returns the sun on cleanup while its own breath is running", () => {
    // A blanket reset would yank the sun out of whatever settle a later stage
    // of the flow (the post-tap intent breath) has put it in.
    expect(normalized).toMatch(
      /onCleanup\(\(\) => \{ stopKeepAlive\(\); .*?if \(getPhase\(\) === "breath" && !hasFinished\) \{ props\.onSunBreathEnd\(\); \}/,
    );
  });

  it("rides the one real sun: the host clears the stale origin, then settles to breathing", () => {
    // Same order the post-tap pause uses - a stale origin would have the copy
    // mid-exhale before the disc has even arrived.
    expect(common).toMatch(
      /const startSunBreath = \(\) => \{ setBreathStartedAt\(undefined\); setSunPhase\("breathing"\); \};/,
    );
    expect(common).toMatch(
      /const endSunBreath = \(\) => \{ setBreathStartedAt\(undefined\); setSunPhase\("interactive"\); requestInteractiveSunFocus\(\); \};/,
    );
  });
});

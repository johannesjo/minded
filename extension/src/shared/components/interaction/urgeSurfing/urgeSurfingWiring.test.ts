import { readFileSync } from "fs";
import { join } from "path";

// Source-text guards for what a node-env test can't render (#183): urge
// surfing runs intro → surf → done with no rating on either side of the wave,
// and every wave ends on the same line.
const source = readFileSync(join(__dirname, "UrgeSurfing.tsx"), "utf8");
// Comments explain what was removed, so they name it; only the code counts.
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("urge surfing wiring", () => {
  it("has exactly the three phases - no rating before or after", () => {
    expect(code).toContain(
      'type UrgeSurfingPhase = "intro" | "surf" | "done";',
    );
    expect(code).not.toMatch(/rateBefore|rateAfter|variant="toggle"|<Rating/);
  });

  it("starts the wave on the sun as the intro hands over to the surf", () => {
    expect(code).toMatch(
      /const handleSurf = \(\): void => \{\s*props\.onCancelCountdown\(\);\s*startSurf\(\);\s*goToPhase\("surf"\);\s*\};/,
    );
    expect(code).toContain("onClick={handleSurf}");
    expect(code).toContain("props.onSunWaveStart(durationMs / 1000);");
  });

  it("settles the sun home at the swap to the close, then speaks", () => {
    expect(code).toContain('goToPhase("done", onSunWaveEnd);');
    expect(code).toMatch(
      /getPhase\(\) === "done" \? VOICE_REVEAL\.SUN_GLIDE_LEAD_MS : 0/,
    );
  });

  it("ends every wave on one line that grades nothing", () => {
    expect(code).toContain(
      'const URGE_SURFING_CLOSE = "The wave moves on its own.";',
    );
    // One close for the done screen: nothing to branch on, no number to echo.
    expect(code).toMatch(/case "done":\s*return URGE_SURFING_CLOSE;/);
    expect(code).not.toMatch(/That's the practice|eased|Tougher/);
    expect(code).not.toMatch(/\bcountSunTap\(/);
  });

  it("stops its timers when it unmounts mid-wave", () => {
    expect(code).toMatch(
      /onCleanup\(\(\) => \{\s*stopTimer\(\);\s*clearCueFade\(\);\s*\}\);/,
    );
  });
});

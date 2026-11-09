import { readFileSync } from "fs";
import { join } from "path";

// Source-text guards for what a node-env test can't render (#183): the
// screen-off break has no fail state, reads no clock, and closes without a
// verdict - any return after being away simply leaves.
const source = readFileSync(
  join(__dirname, "ScreenOffInteraction.tsx"),
  "utf8",
);
// Comments explain what was removed, so they name it; only the code counts.
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("screen-off wiring", () => {
  it("has exactly the three phases - no fail state to land in", () => {
    expect(code).toContain('type ScreenOffPhase = "intro" | "armed" | "done";');
    expect(code).not.toMatch(/tooEarly|Try again/);
  });

  it("never times the break", () => {
    expect(code).not.toMatch(/Date\.now|performance\.now|elapsed|targetMs/i);
  });

  it("meets any return after being away with the same close", () => {
    expect(code).toMatch(
      /if \(document\.hidden\) \{\s*hasBeenAway = true;\s*return;\s*\}\s*if \(hasBeenAway\) \{\s*closeAfterReturn\(\);\s*\}/,
    );
  });

  it("only listens while armed", () => {
    expect(code).toMatch(/if \(getPhase\(\) !== "armed"\) \{\s*return;\s*\}/);
  });

  it("closes without a word, a verdict or a counted sun tap", () => {
    expect(code).toMatch(/done: "",/);
    expect(code).not.toContain('getShownPhase() === "done"');
    expect(code).not.toMatch(/\bcountSunTap\(/);
  });

  it("leaves through the platform leave, and not once disposed", () => {
    expect(code).toContain("if (!isDisposed) onLeaveNow();");
    expect(code).toContain("window.clearTimeout(doneTimeoutId);");
  });
});

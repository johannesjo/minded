import { readFileSync } from "fs";
import { join } from "path";

// Source-text guards for the wiring a node-env test can't render: the redirect
// must reach the platform leave, stand down when the sun takes over, and call a
// native method that actually exists.
const read = (rel: string): string =>
  readFileSync(join(__dirname, rel), "utf8");

describe("alternative redirect wiring", () => {
  it("passes the leave and the superseded read into ShowAlternative", () => {
    const modeSwitch = read("../InteractionModeSwitch.tsx");
    expect(modeSwitch).toContain("onLeaveNow={props.onLeaveNow}");
    expect(modeSwitch).toContain("isSuperseded={() => !!props.isSuperseded}");
    expect(read("../InteractionCommon.tsx")).toContain(
      "isSuperseded={getIsExitingInteraction() || getIsCompletionStarted()}",
    );
  });

  it("skips the delayed redirect once disposed or superseded", () => {
    expect(read("ShowAlternative.tsx")).toContain(
      "if (isDisposed || isSuperseded()) return;",
    );
  });

  it("calls a bridge method the Kotlin overlay interface declares", () => {
    const kotlin = readFileSync(
      join(
        __dirname,
        "../../../../../../android/app/src/main/java/com/minded/minded/overlay/InteractionWindowJavaScriptInterface.kt",
      ),
      "utf8",
    );
    expect(read("ShowAlternative.tsx")).toContain(
      "androidInterface.openAppNamed?.(",
    );
    expect(kotlin).toMatch(
      /@JavascriptInterface\s+fun openAppNamed\(label: String\): Boolean/,
    );
  });
});

import { readFileSync } from "fs";
import { resolve } from "path";
import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";

/**
 * The home-screen widgets mirror these two interaction pools natively — Android
 * in Kotlin (`WidgetPrompts.WAKING_PROMPTS`), iOS in Swift
 * (`WidgetPrompts.wakingPrompts`) — so their cards show real interaction content
 * and tapping lands on that exact NOTICE/ACTION_ADVICE line. Those native lists
 * are hand-maintained copies; this is the drift guard.
 *
 * Every line a widget can show MUST still exist verbatim in the TS source —
 * otherwise the tap's string match (`matchWidgetLine` in InteractionCommon, and
 * the native allow-listing on the way in) silently stops recognising it and the
 * user lands on a random pick instead of the line they tapped. And the two
 * native pools must match each other one-to-one *in order* — same order + same
 * slot arithmetic = the same line at the same moment on both platforms. Keeping
 * it a test (rather than build-time codegen) is the KISS mirror; extracting a
 * generated shared source is the upgrade path if a fourth consumer appears.
 */

// jest runs with cwd = extension/, so the sibling android/ tree is one up and
// ios/ is here.
const readSource = (relPath: string): string =>
  readFileSync(resolve(process.cwd(), relPath), "utf8");

/** The double-quoted string literals inside a Kotlin/Swift list block. */
const extractLines = (
  source: string,
  blockPattern: RegExp,
): ReadonlyArray<string> => {
  const block = source.match(blockPattern)?.[0] ?? "";
  return [
    ...block.replace(/\/\/[^\n]*/g, "").matchAll(/"((?:[^"\\]|\\.)*)"/g),
  ].map((m) => m[1].replace(/\\"/g, '"'));
};

describe("widget prompt mirrors stay in sync with the interaction pools", () => {
  // Grab each pool's list body, up to the closing bracket alone at the
  // property's indentation (string entries never contain that, unlike the `)`
  // in the `// … (notice.const.ts)` comments, which extractLines strips first).
  const kotlinLines = extractLines(
    readSource(
      "../android/app/src/main/java/com/minded/minded/widget/WidgetPrompts.kt",
    ),
    /val WAKING_PROMPTS[\s\S]*?\n {4}\)/,
  );
  const swiftLines = extractLines(
    readSource("ios/App/MindedWidget/WidgetPrompts.swift"),
    /let wakingPrompts[\s\S]*?\n {4}\]/,
  );

  const known = new Set<string>([
    ...NOTICE_CUES.map((c) => c.cue),
    ...ACTION_ADVICES.map((a) => a.txt),
  ]);

  it("extracts the widget pools (guards against a broken regex)", () => {
    expect(kotlinLines.length).toBeGreaterThan(8);
    expect(swiftLines.length).toBeGreaterThan(8);
  });

  it("every Android widget line exists verbatim in NOTICE_CUES or ACTION_ADVICES", () => {
    const missing = kotlinLines.filter((line) => !known.has(line));
    expect(missing).toEqual([]);
  });

  it("the iOS pool matches the Android pool one-to-one, in order", () => {
    // Order matters: both platforms index the pool by the same 15-minute slot
    // count, so equal order is what makes the same moment show the same line.
    expect(swiftLines).toEqual(kotlinLines);
  });
});

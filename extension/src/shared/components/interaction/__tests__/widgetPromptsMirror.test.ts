import { readFileSync } from "fs";
import { resolve } from "path";
import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";

/**
 * The Android home-screen widget mirrors these two interaction pools in Kotlin
 * (`WidgetPrompts.WAKING_PROMPTS`) so its card shows real interaction content and
 * tapping lands on that exact NOTICE/ACTION_ADVICE line. That Kotlin list is a
 * hand-maintained copy; this is the drift guard.
 *
 * Every line the widget can show MUST still exist verbatim in the TS source —
 * otherwise the tap's string match (`matchWidgetLine` in InteractionCommon, and
 * `WidgetPrompts.isWidgetSafeLine` on the native side) silently stops
 * recognising it and the user lands on a random pick instead of the line they
 * tapped. Keeping it a test (rather than build-time codegen) is the KISS mirror;
 * the shared-JSON extraction noted in WidgetPrompts.kt is the upgrade path.
 */
describe("widget prompt mirror stays in sync with the interaction pools", () => {
  // jest runs with cwd = extension/, so the sibling android/ tree is one up.
  const widgetPromptsPath = resolve(
    process.cwd(),
    "../android/app/src/main/java/com/minded/minded/widget/WidgetPrompts.kt",
  );
  const source = readFileSync(widgetPromptsPath, "utf8");

  // Grab the WAKING_PROMPTS list body, up to the `)` alone on its own line at the
  // property's indentation (string entries never contain that, unlike the `)` in
  // the `// … (notice.const.ts)` comments, which we strip first).
  const block = source.match(/val WAKING_PROMPTS[\s\S]*?\n {4}\)/)?.[0] ?? "";
  const widgetLines = [
    ...block.replace(/\/\/[^\n]*/g, "").matchAll(/"((?:[^"\\]|\\.)*)"/g),
  ].map((m) => m[1].replace(/\\"/g, '"'));

  const known = new Set<string>([
    ...NOTICE_CUES.map((c) => c.cue),
    ...ACTION_ADVICES.map((a) => a.txt),
  ]);

  it("extracts the widget pool (guards against a broken regex)", () => {
    expect(widgetLines.length).toBeGreaterThan(8);
  });

  it("every widget line exists verbatim in NOTICE_CUES or ACTION_ADVICES", () => {
    const missing = widgetLines.filter((line) => !known.has(line));
    expect(missing).toEqual([]);
  });
});

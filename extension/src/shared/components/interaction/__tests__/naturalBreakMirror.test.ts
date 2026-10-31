import { readFileSync } from "fs";
import { resolve } from "path";
import {
  MAX_WAIT_MS,
  SCROLL_FALLBACK_MS,
} from "@src/shared/components/interaction/naturalBreak";

/**
 * The natural break is decided separately on each platform (naturalBreak.ts
 * in the web Little Sun, util/NaturalBreak.kt on Android), but it is one rule:
 * how long reading gets before a scroll counts, and the most the pause ever
 * waits. Sibling to interventionPauseMirror.test.ts; jest runs with
 * cwd = extension/.
 */

const ANDROID_NATURAL_BREAK =
  "../android/app/src/main/java/com/minded/minded/util/NaturalBreak.kt";

const nativeLong = (source: string, name: string): number => {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(\\d+)L`));
  if (!match) throw new Error(`could not find ${name} in native source`);
  return Number(match[1]);
};

describe("the natural break mirrors naturalBreak.ts (Kotlin ↔ TS)", () => {
  const source = readFileSync(
    resolve(process.cwd(), ANDROID_NATURAL_BREAK),
    "utf8",
  );

  it("lets reading go on for the same time before a scroll counts", () => {
    expect(nativeLong(source, "NATURAL_BREAK_SCROLL_FALLBACK_MS")).toBe(
      SCROLL_FALLBACK_MS,
    );
  });

  it("never waits longer than the same ceiling", () => {
    expect(nativeLong(source, "NATURAL_BREAK_MAX_WAIT_MS")).toBe(MAX_WAIT_MS);
  });
});

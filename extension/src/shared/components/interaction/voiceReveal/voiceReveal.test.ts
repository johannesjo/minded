import { readFileSync } from "fs";
import { resolve } from "path";
import {
  getVoiceFollowDelayMs,
  getVoiceWordDelayMs,
  splitVoiceWords,
  VOICE_REVEAL,
  voiceFollowStyle,
} from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

const component = readFileSync(resolve(__dirname, "VoiceReveal.tsx"), "utf8");
const styles = readFileSync(resolve(__dirname, "voiceReveal.scss"), "utf8");

const stripComments = (scss: string): string =>
  scss.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const keyframes = (name: string): string => {
  const match = stripComments(styles).match(
    new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?\\n)\\}`),
  );
  if (!match) throw new Error(`missing @keyframes ${name}`);
  return match[1];
};

describe("voice reveal timing", () => {
  it("splits on any whitespace and keeps punctuation with its word", () => {
    expect(splitVoiceWords("  What do you\nwant to  do here? ")).toEqual([
      "What",
      "do",
      "you",
      "want",
      "to",
      "do",
      "here?",
    ]);
    expect(splitVoiceWords("")).toEqual([]);
  });

  it("staggers words gently from the start delay", () => {
    expect(getVoiceWordDelayMs(0, 7)).toBe(VOICE_REVEAL.START_DELAY_MS);
    expect(getVoiceWordDelayMs(1, 7) - getVoiceWordDelayMs(0, 7)).toBe(
      VOICE_REVEAL.STAGGER_MS,
    );
    expect(VOICE_REVEAL.STAGGER_MS).toBeGreaterThanOrEqual(40);
    expect(VOICE_REVEAL.STAGGER_MS).toBeLessThanOrEqual(60);
    expect(VOICE_REVEAL.WORD_MS).toBeGreaterThanOrEqual(500);
    expect(VOICE_REVEAL.WORD_MS).toBeLessThanOrEqual(700);
  });

  it("compresses the stagger so long prompts never become a procession", () => {
    const count = 40;
    const spread =
      getVoiceWordDelayMs(count - 1, count) - getVoiceWordDelayMs(0, count);
    expect(spread).toBeLessThanOrEqual(VOICE_REVEAL.MAX_SPREAD_MS);
    // still strictly in order
    expect(getVoiceWordDelayMs(1, count)).toBeGreaterThan(
      getVoiceWordDelayMs(0, count),
    );
  });

  it("lets the choices follow after the last word starts, never before", () => {
    for (const count of [1, 3, 8, 25]) {
      const lastWordStart = getVoiceWordDelayMs(count - 1, count);
      const follow = getVoiceFollowDelayMs(count);
      expect(follow).toBeGreaterThan(lastWordStart);
      expect(follow).toBeLessThan(lastWordStart + VOICE_REVEAL.WORD_MS);
    }
    expect(voiceFollowStyle("What do you want to do here?")).toEqual({
      "--voice-follow-delay": `${getVoiceFollowDelayMs(7)}ms`,
    });
  });
});

describe("<VoiceReveal> composition", () => {
  it("gives screen readers the whole sentence once, not word fragments", () => {
    expect(component).toContain('<span class="voice-reveal-sr">{props.text}');
    expect(component).toMatch(/class="voice-reveal-words" aria-hidden="true"/);
  });

  it("keeps real spaces between words so balance + line breaking see one sentence", () => {
    expect(component).toContain('{i() > 0 ? " " : ""}');
    expect(stripComments(styles)).toMatch(
      /\.voice-reveal-word\s*\{[^}]*display:\s*inline-block/,
    );
  });

  it("rebuilds words only when the text changes (no re-trigger on re-render)", () => {
    expect(component).toMatch(
      /createMemo\(\(\) =>\s*splitVoiceWords\(props\.text\)/,
    );
  });
});

describe("voice reveal styles", () => {
  it("animates only compositor-friendly properties, once", () => {
    for (const name of [
      "voiceRevealWord",
      "voiceFollowIn",
      "voiceRevealFade",
    ]) {
      const props = [...keyframes(name).matchAll(/([a-z-]+):/g)].map(
        (m) => m[1],
      );
      expect(props.length).toBeGreaterThan(0);
      for (const prop of props) {
        expect(["opacity", "transform", "filter"]).toContain(prop);
      }
    }
    // A single arrival - never a loop, never a rhythm.
    expect(stripComments(styles)).not.toMatch(/infinite|alternate/);
  });

  it("rises a touch with the shared ease-out - no blur (it dropped frames)", () => {
    expect(keyframes("voiceRevealWord")).toMatch(
      /transform:\s*translateY\(0\.2em\)/,
    );
    expect(keyframes("voiceRevealWord")).not.toMatch(/filter/);
    expect(stripComments(styles)).toMatch(
      /\.voice-reveal-word\s*\{[^}]*animation:\s*voiceRevealWord 600ms var\(--ease-out\) backwards/,
    );
  });

  it("never forward-fills, so later opacity changes are not swallowed", () => {
    expect(stripComments(styles)).not.toMatch(
      /animation:[^;]*\b(both|forwards)\b/,
    );
  });

  it("reduces motion to one plain short fade of the whole line", () => {
    const reduced = stripComments(styles).match(
      /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\n)\}/,
    )?.[1];
    expect(reduced).toBeDefined();
    expect(reduced).toMatch(/\.voice-reveal-word\s*\{\s*animation:\s*none;/);
    expect(reduced).toMatch(
      /\.voice-reveal-words,[\s\S]*?\{\s*animation:\s*voiceRevealFade \d+ms/,
    );
    expect(keyframes("voiceRevealFade")).not.toMatch(/filter|transform/);
  });
});

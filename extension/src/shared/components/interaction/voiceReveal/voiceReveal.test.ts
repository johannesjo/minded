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
    // Slow enough to read as speech, not a ripple - but never a procession.
    expect(VOICE_REVEAL.STAGGER_MS).toBeGreaterThanOrEqual(70);
    expect(VOICE_REVEAL.STAGGER_MS).toBeLessThanOrEqual(110);
    expect(VOICE_REVEAL.WORD_MS).toBeGreaterThanOrEqual(800);
    expect(VOICE_REVEAL.WORD_MS).toBeLessThanOrEqual(1000);
  });

  it("waits for the surface to arrive before the first word", () => {
    // The content fade and the sun land first; the voice arrives into a still
    // scene rather than racing them.
    expect(VOICE_REVEAL.START_DELAY_MS).toBeGreaterThanOrEqual(300);
  });

  it("holds the whole sentence back by a lead while the sun is gliding", () => {
    const count = 7;
    const lead = VOICE_REVEAL.SUN_GLIDE_LEAD_MS;
    for (const i of [0, 3, count - 1]) {
      expect(getVoiceWordDelayMs(i, count, lead)).toBe(
        getVoiceWordDelayMs(i, count) + lead,
      );
    }
    expect(getVoiceFollowDelayMs(count, lead)).toBe(
      getVoiceFollowDelayMs(count) + lead,
    );
    expect(voiceFollowStyle("What do you want to do here?", lead)).toEqual({
      "--voice-follow-delay": `${getVoiceFollowDelayMs(7) + lead}ms`,
    });
    // The sun's glide (~650ms) has landed before the first word starts.
    expect(VOICE_REVEAL.START_DELAY_MS + lead).toBeGreaterThanOrEqual(650);
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

  it("lets the choices follow once the last word is mostly in, never over it", () => {
    for (const count of [1, 3, 8, 25]) {
      const lastWordStart = getVoiceWordDelayMs(count - 1, count);
      const follow = getVoiceFollowDelayMs(count);
      expect(follow).toBeGreaterThanOrEqual(
        lastWordStart + VOICE_REVEAL.WORD_MS / 2,
      );
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

  it("rises a touch on the soft voice curve - no blur (it dropped frames)", () => {
    expect(keyframes("voiceRevealWord")).toMatch(
      /transform:\s*translateY\(0\.2em\)/,
    );
    expect(keyframes("voiceRevealWord")).not.toMatch(/filter/);
    // Never the snappy shared ease-out: it lands most of each fade in its
    // first fifth, so every word pops.
    expect(stripComments(styles)).toMatch(
      new RegExp(
        `\\.voice-reveal-word\\s*\\{[^}]*animation:\\s*voiceRevealWord ${VOICE_REVEAL.WORD_MS}ms var\\(--ease-voice\\) backwards`,
      ),
    );
    expect(stripComments(styles)).toMatch(
      new RegExp(
        `\\.voice-follow\\s*\\{[^}]*animation:\\s*voiceFollowIn ${VOICE_REVEAL.FOLLOW_MS}ms var\\(--ease-voice\\)`,
      ),
    );
    expect(stripComments(styles)).not.toContain("--ease-out");
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

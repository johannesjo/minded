import type { JSX } from "solid-js";

// Timing for the word-by-word arrival of a serif prompt (see VoiceReveal.tsx).
// One gentle arrival, never a rhythm: each word fades and settles once,
// staggered just enough to read as the sentence being *spoken* into place.
//
// The composition rule: one thing moves at a time. The surface (sky, content
// fade, sun) arrives first, then the words, then the choices under them - each
// beat starting only as the one before it is nearly settled, never all at once.
export const VOICE_REVEAL = {
  // The words wait for the surface: by now the content fade (--dur-gentle) is
  // mostly in and the sun has settled, so the voice arrives into a still scene
  // instead of racing the surface's own fade.
  START_DELAY_MS: 350,
  // Slow enough to read as speech, not a ripple.
  STAGGER_MS: 85,
  // Keep in sync with the `voiceRevealWord` animation duration in
  // voiceReveal.scss.
  WORD_MS: 900,
  // Long prompts (pattern insights, advice) must not turn into a slow
  // procession: the stagger compresses so the last word always starts within
  // this window.
  MAX_SPREAD_MS: 1100,
  // What follows the prompt (choices, buttons) starts once the last word is
  // mostly in - after the sentence, never over it, but without a dead pause.
  FOLLOW_AT_WORD_FRACTION: 0.7,
  // Keep in sync with the `voiceFollowIn` animation duration in
  // voiceReveal.scss.
  FOLLOW_MS: 800,
  // Extra lead for a prompt that mounts while the sun is still gliding into
  // its slot (the intent/time choices, urge-surfing's settle back from the
  // wave): the sun's ~650ms glide lands before the first word, so the eye
  // follows one moving thing at a time.
  SUN_GLIDE_LEAD_MS: 350,
} as const;

export const splitVoiceWords = (text: string): string[] =>
  (text || "").trim().split(/\s+/).filter(Boolean);

const getStaggerMs = (wordCount: number): number =>
  wordCount <= 1
    ? 0
    : Math.min(
        VOICE_REVEAL.STAGGER_MS,
        VOICE_REVEAL.MAX_SPREAD_MS / (wordCount - 1),
      );

export const getVoiceWordDelayMs = (
  index: number,
  wordCount: number,
  leadMs = 0,
): number =>
  Math.round(
    VOICE_REVEAL.START_DELAY_MS + leadMs + index * getStaggerMs(wordCount),
  );

/** When content following a prompt of `wordCount` words should begin to arrive. */
export const getVoiceFollowDelayMs = (wordCount: number, leadMs = 0): number =>
  wordCount <= 0
    ? VOICE_REVEAL.START_DELAY_MS + leadMs
    : Math.round(
        getVoiceWordDelayMs(wordCount - 1, wordCount, leadMs) +
          VOICE_REVEAL.WORD_MS * VOICE_REVEAL.FOLLOW_AT_WORD_FRACTION,
      );

/**
 * Style for a `.voice-follow-scope` parent: its `.voice-follow` children (the
 * choices under the prompt) arrive softly after the prompt's last word. Pass
 * the same `leadMs` as the prompt's <VoiceReveal lead>.
 */
export const voiceFollowStyle = (
  text: string,
  leadMs = 0,
): JSX.CSSProperties => ({
  "--voice-follow-delay": `${getVoiceFollowDelayMs(splitVoiceWords(text).length, leadMs)}ms`,
});

import type { JSX } from "solid-js";

// Timing for the word-by-word arrival of a serif prompt (see VoiceReveal.tsx).
// One gentle arrival, never a rhythm: each word fades and settles once,
// staggered just enough to read as the sentence being *spoken* into place.
export const VOICE_REVEAL = {
  // Matches the old whole-line `slideUpFadeIn` delay, so the prompt still
  // begins arriving as the intervention surface settles.
  START_DELAY_MS: 200,
  STAGGER_MS: 50,
  // Keep in sync with the `voiceRevealWord` animation duration in
  // voiceReveal.scss.
  WORD_MS: 600,
  // Long prompts (pattern insights, advice) must not turn into a slow
  // procession: the stagger compresses so the last word always starts within
  // this window.
  MAX_SPREAD_MS: 700,
  // What follows the prompt (choices, buttons) starts once the last word is
  // halfway in - after it, never before, but without a dead pause.
  FOLLOW_AT_WORD_FRACTION: 0.5,
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

export const getVoiceWordDelayMs = (index: number, wordCount: number): number =>
  Math.round(VOICE_REVEAL.START_DELAY_MS + index * getStaggerMs(wordCount));

/** When content following a prompt of `wordCount` words should begin to arrive. */
export const getVoiceFollowDelayMs = (wordCount: number): number =>
  wordCount <= 0
    ? VOICE_REVEAL.START_DELAY_MS
    : Math.round(
        getVoiceWordDelayMs(wordCount - 1, wordCount) +
          VOICE_REVEAL.WORD_MS * VOICE_REVEAL.FOLLOW_AT_WORD_FRACTION,
      );

/**
 * Style for a `.voice-follow-scope` parent: its other direct children (the
 * choices under the prompt) arrive softly after the prompt's last word.
 */
export const voiceFollowStyle = (text: string): JSX.CSSProperties => ({
  "--voice-follow-delay": `${getVoiceFollowDelayMs(splitVoiceWords(text).length)}ms`,
});

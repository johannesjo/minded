/**
 * Cues for the "notice → tap" micro-action (the NOTICE interaction).
 *
 * Each cue invites one small, embodied or sensory anchor in the *present
 * moment* - something the user actually does, then confirms with a single tap.
 * That keeps it on the right side of the bar for what we say: we name an
 * observed action, never an inferred feeling; the here-and-now, never a stale
 * timestamp; and there is nothing to score, type, or get "right".
 *
 * This is also the pool the daily-questions card offers as its *quick pause* -
 * the one-tap alternative for a morning (or evening) with no time to type (see
 * `getQuickPause.ts`). That is why the pool grew past pure sensory anchors into
 * short complete practices - counting a few breaths, naming what is here,
 * letting one thought pass. Same shape, same bar, same tap; a second pool of
 * near-identical lines would only have split the content in two.
 *
 * Breath cues used to be excluded here on the grounds that "the sun already *is*
 * the breath". That was too broad: the sun breathes only in *guided* pauses -
 * the timed sit and `StrongFrictionBreathPause` - and never on the NOTICE
 * screen, so a counted breath here steps on nothing. The rule that survives is
 * narrower and still absolute: NOTICE never *animates* a breath. It names a
 * practice and waits for the tap; the swelling disc stays the guided pauses'
 * alone.
 *
 * No decorative glyph, by design: platform emoji are the loudest, most chat-app
 * mark available - they render differently on every OS, sit at full saturation,
 * and clash with the hand-tuned serif/sky language around them. The serif cue
 * line carries the screen on its own, and the minimalism principle says the
 * glyph must earn its place; it doesn't. (See #168, follow-up to #129.)
 *
 * - `cue`  the invitation - gentle, never an order
 * - `done` the confirming tap's label - a quiet acknowledgement of the doing
 */
export const NOTICE_CUES: {
  cue: string;
  done: string;
}[] = [
  { cue: "Feel both feet on the floor.", done: "I can feel them" },
  { cue: "Let your jaw and shoulders soften.", done: "I let go" },
  { cue: "Let your hands fall open and rest.", done: "Resting" },
  {
    cue: "Find the farthest thing you can see, and rest your eyes on it.",
    done: "I'm back",
  },
  {
    cue: "Listen for the most distant sound you can hear.",
    done: "I hear it",
  },
  { cue: "Notice the texture under your fingertips.", done: "Noticed" },
  { cue: "Feel the weight of your body, wherever you are.", done: "I feel it" },
  {
    cue: "Notice the temperature of the air on your skin.",
    done: "Noticed",
  },
  { cue: "Find three colors around you.", done: "Found them" },
  // Short complete practices - a little more than a single noticing, still done
  // in well under a minute and confirmed by the same one tap. Kept ASCII and
  // ≤70 chars like every other cue, so any of them can also ride the widget.
  { cue: "Take three slow breaths.", done: "I took them" },
  { cue: "Count ten out-breaths, then stop.", done: "Counted" },
  { cue: "Notice your next thought, and let it pass.", done: "It passed" },
  // Naming, not judging: the user supplies the word, the app never guesses it.
  { cue: "Name what you feel, without judging it.", done: "There it is" },
  { cue: "Name one thing you are grateful for right now.", done: "Named it" },
  {
    cue: "For half a minute, notice whatever comes: sounds, thoughts, feelings.",
    done: "I noticed",
  },
  {
    cue: "Stretch slowly, and feel the movement as it happens.",
    done: "Stretched",
  },
  {
    cue: "Look out of a window for a minute, without looking for anything.",
    done: "I looked",
  },
] as const;

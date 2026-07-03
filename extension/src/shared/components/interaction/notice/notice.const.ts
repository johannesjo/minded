/**
 * Cues for the "notice → tap" micro-action (the NOTICE interaction).
 *
 * Each cue invites one small, embodied or sensory anchor in the *present
 * moment* — something the user actually does, then confirms with a single tap.
 * That keeps it on the right side of the bar for what we say: we name an
 * observed action, never an inferred feeling; the here-and-now, never a stale
 * timestamp; and there is nothing to score, type, or get "right".
 *
 * Deliberately no breath-counting cue: the sun already *is* the breath (see
 * `InteractionCommon` / `StrongFrictionBreathPause`), so a second breathing
 * prompt would step on it.
 *
 * No decorative glyph, by design: platform emoji are the loudest, most chat-app
 * mark available — they render differently on every OS, sit at full saturation,
 * and clash with the hand-tuned serif/sky language around them. The serif cue
 * line carries the screen on its own, and the minimalism principle says the
 * glyph must earn its place; it doesn't. (See #168, follow-up to #129.)
 *
 * - `cue`  the invitation — gentle, never an order
 * - `done` the confirming tap's label — a quiet acknowledgement of the doing
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
] as const;

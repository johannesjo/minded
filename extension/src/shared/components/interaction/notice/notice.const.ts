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
 * - `ico`  a soft glyph for the cue (decorative)
 * - `cue`  the invitation — gentle, never an order
 * - `done` the confirming tap's label — a quiet acknowledgement of the doing
 */
export const NOTICE_CUES: {
  ico: string;
  cue: string;
  done: string;
}[] = [
  { ico: "🦶", cue: "Feel both feet on the floor.", done: "I can feel them" },
  {
    ico: "😌",
    cue: "Let your jaw and shoulders soften.",
    done: "Softened",
  },
  { ico: "🤲", cue: "Let your hands fall open and rest.", done: "Resting" },
  {
    ico: "👀",
    cue: "Find the farthest thing you can see, and rest your eyes on it.",
    done: "I'm back",
  },
  {
    ico: "👂",
    cue: "Listen for the most distant sound you can hear.",
    done: "I hear it",
  },
  {
    ico: "✋",
    cue: "Notice the texture under your fingertips.",
    done: "Noticed",
  },
  {
    ico: "🪑",
    cue: "Feel the weight of your body where you're sitting.",
    done: "I feel it",
  },
  {
    ico: "🌡️",
    cue: "Notice the temperature of the air on your skin.",
    done: "Done",
  },
  {
    ico: "👁️",
    cue: "Let your eyes close for one slow moment.",
    done: "Opened",
  },
  {
    ico: "🎨",
    cue: "Find three colours in the room around you.",
    done: "Found them",
  },
] as const;

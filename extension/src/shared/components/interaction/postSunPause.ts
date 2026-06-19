import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";
import {
  BREATH_PAUSE_PATTERN,
  breathCycleSeconds,
} from "@src/shared/components/interaction/breathTimeline";

// One full guided breath (inhale → hold → exhale). Derived from the breath
// pattern so the pause length and the animation can never disagree.
export const STRONG_FRICTION_BREATH_PAUSE_SECONDS =
  breathCycleSeconds(BREATH_PAUSE_PATTERN);

export const getPostSunPauseSeconds = (frictionLevel: FrictionLevel): number =>
  frictionLevel === "strong" ? STRONG_FRICTION_BREATH_PAUSE_SECONDS : 0;

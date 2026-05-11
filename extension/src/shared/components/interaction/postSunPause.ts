import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";

export const STRONG_FRICTION_BREATH_PAUSE_SECONDS = 7;

export const getPostSunPauseSeconds = (frictionLevel: FrictionLevel): number =>
  frictionLevel === "strong" ? STRONG_FRICTION_BREATH_PAUSE_SECONDS : 0;

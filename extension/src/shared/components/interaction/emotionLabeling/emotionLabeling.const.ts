/** Primary emotions available for selection */
export const PRIMARY_EMOTIONS = [
  "anxious",
  "sad",
  "angry",
  "ashamed",
  "overwhelmed",
  "lonely",
  "bored",
  "content",
  "excited",
  "hopeful",
  "grateful",
  "curious",
] as const;

/** Body locations where emotions can be felt */
export const BODY_LOCATIONS = [
  "head",
  "neck",
  "throat",
  "chest",
  "stomach",
  "back",
  "shoulders",
  "hands",
  "whole body",
] as const;

export type BodyLocation = (typeof BODY_LOCATIONS)[number];

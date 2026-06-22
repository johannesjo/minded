export type SleepWindDownActivityKey =
  | "brainDump"
  | "gratitude"
  | "tomorrow"
  | "breathing"
  | "calmRead"
  | "tips";

export type SleepWindDownActivityAction = "complete" | "return";

const RETURN_ONLY_ACTIVITY_KEYS: ReadonlySet<SleepWindDownActivityKey> =
  new Set(["breathing", "calmRead"]);

export const getSleepWindDownActivityAction = (
  activityKey: SleepWindDownActivityKey,
): SleepWindDownActivityAction =>
  RETURN_ONLY_ACTIVITY_KEYS.has(activityKey) ? "return" : "complete";

import type {
  InterventionPause,
  InterventionPauseKind,
  SyncData,
  UserCfg,
} from "@src/dataInterface/syncData";
import { resolveNightId } from "@src/shared/components/sleepWindDown/sleepWindDown.util";

/**
 * The skip check-in: when the user has gone straight past the pause this many
 * times in a row, the next intervention asks - once - how the sun should meet
 * them, instead of offering the triple-tap. A pass that has become muscle
 * memory is worth nothing to anyone; asking turns it back into one awake
 * choice. Whatever they pick, they picked it on purpose, so we never have to
 * guess whether the passing meant "I'm fine" or "I'm on autopilot".
 *
 * The streak only decides *when to ask*. It is never shown, never named in
 * copy, and never feeds friction - the check-in says what happened ("tapping
 * past the sun"), never how often.
 */
export const SKIP_CHECK_IN_THRESHOLD = 10;

/**
 * How long a check-in answer stands - every answer, "as it does now" included,
 * so the check-in asks at most once a week and stays rare.
 */
export const INTERVENTION_PAUSE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "Lately" has to be true: a streak only holds while the passes keep coming.
 * A longer gap than this between two passes starts the count over, and a
 * streak whose last pass is older than this can't bring the check-in.
 */
export const SKIP_STREAK_MAX_GAP_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * "Only after a while": the sun appears on every open, and the full pause
 * waits until the user has been in the session this long. The pause then
 * meets them mid-session - a moment the thumb hasn't learned to skip, and the
 * one where drifting actually happens.
 */
export const LATER_PAUSE_AFTER_S = 10 * 60;

export type SkipCheckInChoice = "as_now" | InterventionPauseKind;

/**
 * The check-in's words. The first line states only what happened - the
 * gesture itself, tapping past the sun - never how often, and never what it
 * means ("you don't seem to need minded" would be a guess). The choices then
 * answer the question directly; each one continues into the app.
 */
export const SKIP_CHECK_IN_OBSERVATION =
  "You've been tapping past the sun lately.";
export const SKIP_CHECK_IN_QUESTION = "How should the sun meet you?";
export const SKIP_CHECK_IN_CHOICES: ReadonlyArray<{
  choice: SkipCheckInChoice;
  label: string;
}> = [
  { choice: "as_now", label: "As it does now" },
  { choice: "later", label: "Only after a while" },
  { choice: "off", label: "Not this week" },
];

/**
 * The check-in lands while the thumb is often still mid-triple-tap. Choices
 * only respond once they have faded in, so a reflexive tap can never pick a
 * week off on the user's behalf. Kept regardless of reduced motion: the thumb
 * is just as fast either way.
 */
export const SKIP_CHECK_IN_ARM_MS = 1000;

export const getActiveInterventionPause = (
  syncData: Pick<SyncData, "interventionPause">,
  now: number,
): InterventionPause | undefined => {
  const pause = syncData.interventionPause;
  return pause && pause.untilTS > now ? pause : undefined;
};

export const isInterventionPauseActive = (
  syncData: Pick<SyncData, "interventionPause">,
  kind: InterventionPauseKind,
  now: number,
): boolean => getActiveInterventionPause(syncData, now)?.kind === kind;

type SkipState = Pick<
  SyncData,
  "skipStreak" | "lastSkipTS" | "interventionPause"
> & { cfg?: Pick<UserCfg, "sleepWindDown"> };

const isBedtime = (syncData: SkipState, now: number): boolean => {
  const bedtimeCfg = syncData.cfg?.sleepWindDown;
  return !!bedtimeCfg && resolveNightId(bedtimeCfg, new Date(now)) !== null;
};

const isRecent = (lastSkipTS: number | undefined, now: number): boolean =>
  !!lastSkipTS && now - lastSkipTS <= SKIP_STREAK_MAX_GAP_MS;

export const isSkipCheckInDue = (syncData: SkipState, now: number): boolean =>
  (syncData.skipStreak ?? 0) >= SKIP_CHECK_IN_THRESHOLD &&
  isRecent(syncData.lastSkipTS, now) &&
  // They already answered; don't ask again while that answer stands.
  !getActiveInterventionPause(syncData, now);

/**
 * One more pass into the app, or null when it doesn't count. Frozen while an
 * answer stands, so the week the user asked for never quietly counts toward
 * asking them again; never at bedtime, where the check-in never asks, so it is
 * never about bedtime taps; after a long gap it starts over at one, because
 * the earlier passes aren't "lately".
 */
export const getSkipUpdateAfterSkip = (
  syncData: SkipState,
  now: number,
): Pick<SyncData, "skipStreak" | "lastSkipTS"> | null => {
  if (isBedtime(syncData, now)) return null;
  if (getActiveInterventionPause(syncData, now)) return null;
  const streak = isRecent(syncData.lastSkipTS, now)
    ? (syncData.skipStreak ?? 0)
    : 0;
  return { skipStreak: streak + 1, lastSkipTS: now };
};

/** Every answer starts the count over and stands for a week. */
export const getSkipCheckInUpdate = (
  choice: SkipCheckInChoice,
  now: number,
): Pick<SyncData, "skipStreak" | "interventionPause"> => ({
  skipStreak: 0,
  interventionPause: { kind: choice, untilTS: now + INTERVENTION_PAUSE_MS },
});

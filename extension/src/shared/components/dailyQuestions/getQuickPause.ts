import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { DailyQuestionsMode } from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";

export type QuickPause = (typeof NOTICE_CUES)[number];

/**
 * The *quick pause*: the one-tap alternative the daily-questions card offers
 * beside the questions themselves.
 *
 * Why it exists: the daily questions ask you to type, and a morning that has no
 * spare minute simply skips them - so the card that was meant to open the day
 * gently becomes the card you dismiss. The quick pause gives that same card a
 * door you can walk through in ten seconds: one present-moment practice, done
 * where you stand, confirmed with a single tap. Nothing is stored and nothing is
 * scored (there is no "you did the quick one" anywhere) - the doing is the whole
 * point, exactly as on the NOTICE screen this borrows its content from.
 *
 * Not morning-only: the evening card gets one too. Evening reflection is at
 * least as easy to skip, and a short practice suits winding down just as well.
 *
 * The pick is a pure function of the local day and the mode, never a fresh roll:
 * the dashboard re-runs `refresh()` on all sorts of events, and a line that
 * reshuffled under someone mid-read would turn a calm card into a slot machine.
 * Deterministic also means "come back in five minutes" shows the same
 * invitation, which is the honest behaviour - the card is not a feed.
 *
 * Stride 2 per day (morning then evening) walks the whole pool as long as the
 * pool size is odd-or-simply-coprime with 2 - i.e. any odd size; with an even
 * size a given slot would only ever see half of it. Guarded by a test, so a cue
 * added or removed can't silently halve the variety.
 */
export const getQuickPause = (
  now: Date,
  mode: DailyQuestionsMode,
): QuickPause => {
  // Local-midnight based, so the pair turns over when the user's day does -
  // not at UTC midnight, which for most of the world lands mid-day or mid-sleep.
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayIndex = Math.floor(startOfDay / 86_400_000);
  const index = dayIndex * 2 + (mode === "Evening" ? 1 : 0);
  // `%` keeps the sign of the dividend in JS, and dayIndex is negative before
  // 1970 (reachable with a skewed device clock), so normalise into range.
  const size = NOTICE_CUES.length;
  return NOTICE_CUES[((index % size) + size) % size];
};

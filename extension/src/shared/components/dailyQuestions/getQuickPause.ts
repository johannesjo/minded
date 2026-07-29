import { NOTICE_CUES } from "@src/shared/components/interaction/notice/notice.const";
import { DailyQuestionsMode } from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";

/**
 * One offer the daily-questions card can make. `notice` completes on the card
 * itself - the cue is the practice and `action` is the confirming tap. `breath`
 * is the one the sun has to lead, so its `action` opens `/quickBreath` instead
 * of finishing in place.
 */
export type QuickPause = {
  kind: "notice" | "breath";
  /** The line the card speaks, in the serif voice. */
  cue: string;
  /** The button beneath it - a confirmation for `notice`, an invitation for `breath`. */
  action: string;
};

/**
 * The guided breath: one slow inhale → hold → exhale, led by the shell sun.
 *
 * One breath, not three. The whole point of these is to slip under "I don't
 * have time for this", and that dismissal doesn't wait for a stopwatch - it
 * fires the moment something *looks* like it needs planning around. Twelve
 * seconds cannot look like that. Three breaths (thirty-six) can.
 *
 * It is also the only offer here that is not printed text, because a breath is
 * the one practice the app can genuinely lead rather than merely name.
 */
const GUIDED_BREATH: QuickPause = {
  kind: "breath",
  cue: "Take one slow breath.",
  action: "breathe",
};

/**
 * Everything the card can offer: the NOTICE cues, which are already exactly this
 * shape (a line plus a one-tap acknowledgement), plus the guided breath.
 */
export const QUICK_PAUSES: ReadonlyArray<QuickPause> = [
  ...NOTICE_CUES.map(
    (c): QuickPause => ({ kind: "notice", cue: c.cue, action: c.done }),
  ),
  GUIDED_BREATH,
];

/**
 * The *quick pause*: the offer the daily-questions card leads with, beside the
 * questions themselves.
 *
 * Why it exists: the daily questions ask you to type, and a morning with no
 * spare minute simply skips them - so the card meant to open the day gently
 * becomes the card you dismiss. The quick pause gives that card a door you can
 * walk through in seconds. Nothing is stored and nothing is scored (there is
 * no "you did the quick one" anywhere) - the doing is the whole point.
 *
 * Not morning-only: the evening card gets one too, and never the same one as
 * that morning. Evening reflection is at least as easy to skip, and a short
 * practice suits winding down just as well.
 *
 * The pick is a pure function of the local day and the mode, never a fresh roll:
 * the dashboard re-runs `refresh()` on all sorts of events, and a line that
 * reshuffled under someone mid-read would turn a calm card into a slot machine.
 * Deterministic also means "come back in five minutes" shows the same
 * invitation, which is the honest behaviour - the card is not a feed.
 */

/**
 * A fixed slot (every morning, say) walks the pool one entry per day. Stride 1
 * is the only stride coprime with *every* pool size, so the "a morning glance
 * eventually sees all of it" property cannot be broken by adding or cutting a
 * cue - which a larger stride can, silently: at stride 7 a pool of 14 would
 * have shown seven of them and never the rest.
 */
const DAILY_STRIDE = 1;

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
  const size = QUICK_PAUSES.length;
  // Evening sits half a pool away from that morning rather than next to it, so
  // the two ends of a day are never the same practice and never adjacent ones.
  const index =
    dayIndex * DAILY_STRIDE + (mode === "Evening" ? Math.floor(size / 2) : 0);
  // `%` keeps the sign of the dividend in JS, and dayIndex is negative before
  // 1970 (reachable with a skewed device clock), so normalise into range.
  return QUICK_PAUSES[((index % size) + size) % size];
};

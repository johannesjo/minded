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
 * Interleave by zipping the two halves: first, middle, second, middle+1, …
 * This is a permutation for *any* length (unlike a step-by-k shuffle, which
 * silently drops and repeats entries whenever k shares a factor with the size),
 * so it can never cost the pool an entry as cues come and go.
 *
 * It exists because the offer advances one entry per day through this array, so
 * the array's order *is* the order mornings arrive in - and cues are authored in
 * thematic batches. Without this, the batch added together would surface on
 * consecutive mornings, which reads as the app having one idea that week.
 */
const interleaved = <T>(items: ReadonlyArray<T>): T[] => {
  const mid = Math.ceil(items.length / 2);
  const out: T[] = [];
  for (let i = 0; i < mid; i++) {
    out.push(items[i]);
    if (mid + i < items.length) out.push(items[mid + i]);
  }
  return out;
};

/**
 * Everything the card can offer: the NOTICE cues, which are already exactly this
 * shape (a line plus a one-tap acknowledgement), plus the guided breath.
 */
export const QUICK_PAUSES: ReadonlyArray<QuickPause> = interleaved([
  ...NOTICE_CUES.map(
    (c): QuickPause => ({ kind: "notice", cue: c.cue, action: c.done }),
  ),
  GUIDED_BREATH,
]);

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
  // Count calendar days off the *local* date parts via Date.UTC, so the day the
  // card turns over is the user's day - not UTC's, which for most of the world
  // lands mid-afternoon or mid-sleep.
  //
  // Date.UTC and not a local-midnight timestamp: dividing local midnight by a
  // fixed 86,400,000 assumes every day is 24h, and twice a year it isn't. In
  // zones sitting near UTC (London, Lisbon) that division yields the *same*
  // index two days running after the spring change, and skips one after the
  // autumn change - a repeated morning and a lost cue, once a year each. Date
  // parts have no such gap: consecutive dates are always exactly one apart.
  const dayIndex =
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000;
  const size = QUICK_PAUSES.length;
  // Evening sits half a pool away from that morning, so the two ends of a day
  // are never the same practice (and, from four entries up, never neighbours).
  const index =
    dayIndex * DAILY_STRIDE + (mode === "Evening" ? Math.floor(size / 2) : 0);
  // `%` keeps the sign of the dividend in JS, and dayIndex is negative before
  // 1970 (reachable with a skewed device clock), so normalise into range.
  return QUICK_PAUSES[((index % size) + size) % size];
};

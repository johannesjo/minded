import { onCleanup, onMount } from "solid-js";
import { useBeforeLeave, useLocation, useNavigate } from "@solidjs/router";
import {
  setBreathStartedAt,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import { StrongFrictionBreathPause } from "@src/shared/components/interaction/breathPause/StrongFrictionBreathPause";
import { STRONG_FRICTION_BREATH_PAUSE_SECONDS } from "@src/shared/components/interaction/postSunPause";
import { setDailyQuestionsDoneForToday } from "@src/dataInterface/commonSyncDataInterface";
import {
  DailyQuestionsMode,
  getDailyQuestionsMode,
} from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
// @ts-ignore
import styles from "./QuickBreath.module.scss";

// Let the final exhale land before the page changes under it. The route
// transition then fades as every other one does, so the breath ends in a
// settling rather than a cut. Must stay above zero or the settle becomes the
// cut it exists to prevent (pinned by test).
export const AFTER_BREATH_WAIT_MS = 900;

/** What the card hands over when it sends someone here (see DashboardGroups). */
export interface QuickBreathNavState {
  /** The day-half the *card* was showing, not one this route re-derives. */
  mode?: DailyQuestionsMode;
  /** When the card was revealed, so a breath finishing after midnight still
   *  marks the day it belongs to rather than the one it lands in. */
  startedAtTS?: number;
}

/**
 * The guided quick pause: one slow breath, led by the sun.
 *
 * The daily-questions card offers this the way it offers a NOTICE cue, but a
 * breath is the one practice the app can actually *lead* rather than merely
 * name - "Take one slow breath." printed on a card is an instruction, while the
 * same words over a swelling disc are something to follow. So this one gets a
 * surface, and that surface borrows the very machinery the strong-friction
 * intervention pause already uses: the shell sun in its `breathing` role, and
 * `StrongFrictionBreathPause` reading the sun's published origin so the copy and
 * the disc turn through inhale → hold → exhale on the same beats.
 *
 * Deliberately a route, not an overlay: the global bottom bar shows its back
 * arrow here, so leaving is one obvious tap - and leaving early marks nothing.
 * Only a finished breath spends the day's invitation.
 */
const QuickBreath = () => {
  const navigate = useNavigate();
  const location = useLocation();
  let t0: NodeJS.Timeout | undefined;

  // What the card handed over. Falling back to a fresh read keeps a direct
  // visit working, but the card's own values are preferred for both: this route
  // reading its own clock is a second reading of a moment the card already
  // pinned, and the two can disagree across a boundary (the card revealed at
  // 19:59 as "Morning", this route mounting at 20:00 as "Evening").
  const navState = () => (location.state ?? {}) as QuickBreathNavState;
  const mode: DailyQuestionsMode = navState().mode ?? getDailyQuestionsMode();
  // Stamped against the moment the invitation was *taken up*, not the moment
  // the breath happens to end. `setDailyQuestionsDoneForToday` defaults to
  // Date.now(), and `isShowDailyQuestionsBanner` gates on isToday() - so a
  // breath begun at 23:59:50 and finished at 00:00:02 would otherwise stamp the
  // new day and suppress a card nobody has seen yet.
  const startedAtTS: number = navState().startedAtTS ?? Date.now();

  // Leaving is not finishing. Every exit from here - the pause's own cancel,
  // the bottom bar's back arrow, a route change from anywhere else - goes
  // through `navigate`, which the global page-fade guard intercepts: it calls
  // preventDefault and retries 240ms later, so this component and the breath
  // clock inside it stay alive for the whole fade. A breath whose last moments
  // fall in that window would otherwise complete on the way out and spend a day
  // the user just declined. `useBeforeLeave` fires on every one of those exits,
  // which a flag set only in the cancel handler did not.
  let hasLeft = false;

  useBeforeLeave(() => {
    hasLeft = true;
  });

  onMount(() => {
    // Clear first: a stale origin from an earlier pause would have the copy
    // mid-exhale before the disc has even arrived.
    setBreathStartedAt(undefined);
    setSunRole("breathing");
  });

  onCleanup(() => {
    // Belt and braces for an unmount that never routed (a parent tearing the
    // tree down). The breath clock registers its own cleanup after this one and
    // Solid runs them in reverse, so by here the completion timer is usually
    // already cancelled - `useBeforeLeave` above is what actually closes the
    // window.
    hasLeft = true;
    window.clearTimeout(t0);
    // Hand the disc back to its companion rest; from here it glides down to the
    // bottom bar of whatever we navigate to.
    setSunRole("companion");
    setBreathStartedAt(undefined);
  });

  const finish = () => {
    if (hasLeft) return;
    // Nothing more can complete: the breath is spent, and the cancel button
    // stays on screen through the settle below.
    hasLeft = true;
    // Only now is the day's invitation spent - and, as everywhere else here,
    // nothing records that this was the door taken.
    setDailyQuestionsDoneForToday(mode, startedAtTS);
    window.clearTimeout(t0);
    // `replace`, not push: this route shows itself out, so the user never chose
    // to come back to the dashboard. Without it the next back gesture lands
    // here again and starts a second breath.
    t0 = setTimeout(
      () => navigate("/", { replace: true }),
      AFTER_BREATH_WAIT_MS,
    );
  };

  return (
    <div
      classList={{
        [styles.wrapper]: true,
        pageTransitionIn: true,
        pageWrapper: true,
      }}
    >
      {/* The breathing disc is the shell sun overhead, not drawn here - the
          pause reserves its footprint so the cue keeps its place beneath it. */}
      <StrongFrictionBreathPause
        seconds={STRONG_FRICTION_BREATH_PAUSE_SECONDS}
        onComplete={finish}
        onCancel={() => navigate("/")}
      />
    </div>
  );
};

export default QuickBreath;

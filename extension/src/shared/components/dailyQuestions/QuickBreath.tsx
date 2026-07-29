import { onCleanup, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  setBreathStartedAt,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
import { StrongFrictionBreathPause } from "@src/shared/components/interaction/breathPause/StrongFrictionBreathPause";
import { STRONG_FRICTION_BREATH_PAUSE_SECONDS } from "@src/shared/components/interaction/postSunPause";
import { setDailyQuestionsDoneForToday } from "@src/dataInterface/commonSyncDataInterface";
import { getDailyQuestionsMode } from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import styles from "./QuickBreath.module.scss";

// Let the final exhale land before the page changes under it. The route
// transition then fades as every other one does, so the breath ends in a
// settling rather than a cut.
const AFTER_BREATH_WAIT_MS = 900;

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
  let t0: NodeJS.Timeout | undefined;

  onMount(() => {
    // Clear first: a stale origin from an earlier pause would have the copy
    // mid-exhale before the disc has even arrived.
    setBreathStartedAt(undefined);
    setSunRole("breathing");
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    // Hand the disc back to its companion rest; from here it glides down to the
    // bottom bar of whatever we navigate to.
    setSunRole("companion");
    setBreathStartedAt(undefined);
  });

  const finish = () => {
    // Only now is the day's invitation spent - and, as everywhere else here,
    // nothing records that this was the door taken.
    setDailyQuestionsDoneForToday(getDailyQuestionsMode());
    window.clearTimeout(t0);
    t0 = setTimeout(() => navigate("/"), AFTER_BREATH_WAIT_MS);
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

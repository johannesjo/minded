import { createSignal, JSX, Match, onMount, Show, Switch } from "solid-js";
import {
  getUsageObservation,
  markUsageObservationShown,
  IS_ANDROID,
} from "@src/dataInterface/commonSyncDataInterface";
import {
  formatUsageDuration,
  MIN_OBSERVATION_SECONDS,
  UsageObservation,
} from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/usageObservation";
import { Question } from "@src/shared/components/interaction/Question";
import { QUESTIONS } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { getRndEntry } from "@src/util/getRndEntry";
import Btn from "@src/shared/components/ui/Btn";
import { prefersReducedMotion } from "@src/util/prefersReducedMotion";
import { createScreenFade } from "@src/util/screenFade";

// `undefined` = still loading; `null` = no usable usage signal.
type ObservationState = UsageObservation | null | undefined;

export const AppUsageOrBrowsingBehavior: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getStep, setStep] = createSignal<number>(0);
  const [getObservation, setObservation] =
    createSignal<ObservationState>(undefined);

  const FADE_MS = 240;
  // Cross-screen fade between the usage observation and the follow-up question,
  // via the shared helper rather than hard-cutting the <Switch>: drop opacity to
  // 0, swap the step while hidden, then ease back in. Matches the FADE_MS
  // transition on the root element below.
  const screenFade = createScreenFade(FADE_MS);

  onMount(() => {
    // Mark the throttle the moment we surface, so the observation stays rare
    // regardless of how the user leaves it.
    void markUsageObservationShown();
    void getUsageObservation().then((observation) => {
      setObservation(observation);
      // Nothing meaningful to observe yet → go straight to the gentle reflection.
      if (!observation || observation.todaySeconds < MIN_OBSERVATION_SECONDS) {
        setStep(1);
      }
    });
  });

  const targetLabel = (): string => {
    const observation = getObservation();
    if (!observation || observation.topTargets.length === 0) {
      return IS_ANDROID
        ? "the apps you're using less"
        : "the sites you're using less";
    }
    return observation.topTargets
      .slice(0, 2)
      .map((target) => target.label)
      .join(" & ");
  };

  const rndQuestion = getRndEntry(
    QUESTIONS.filter((q) =>
      (IS_ANDROID
        ? [QID.HAU1, QID.HAU2, QID.HAU3, QID.HAU4, QID.HAU5]
        : [QID.HBH1, QID.HBH2, QID.HBH3, QID.HBH4, QID.HBH5]
      ).includes(q.id),
    ),
  );

  return (
    <div
      id="minded-6622-browsing-behavior-rating"
      style={{
        opacity: screenFade.opacity(),
        transition: prefersReducedMotion()
          ? "none"
          : `opacity ${FADE_MS}ms ease-in-out`,
      }}
      onmousemove={props.onCancelCountdown}
    >
      <Switch>
        <Match when={getStep() === 0}>
          <Show when={getObservation()}>
            {(observation) => (
              <div>
                {/* Today's observed fact only - deliberately no "usually by
                    now" baseline: a comparison against a personal average
                    reads as a benchmark, the register the app avoids. */}
                <div class="txtBig" style="padding-bottom:8px;">
                  You've spent about{" "}
                  {formatUsageDuration(observation().todaySeconds)} on{" "}
                  {targetLabel()} so far today.
                </div>
                <Btn onClick={() => screenFade.toScreen(() => setStep(1))}>
                  continue
                </Btn>
              </div>
            )}
          </Show>
        </Match>
        <Match when={getStep() === 1}>
          <Question
            initialQuestion={rndQuestion}
            answers={[]}
            onCancelCountdown={props.onCancelCountdown}
            onSuccess={() => props.onSuccess()}
            onSkip={() => undefined}
            onUpdateQuestion={() => undefined}
          />
        </Match>
      </Switch>
    </div>
  );
};

/* @refresh reload */
import { createSignal, JSX, Match, Switch } from "solid-js";
// @ts-ignore
import { rateCurrentBrowsingBehavior } from "@dataInterface/syncDataInterface";
import { BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/browsing-behavior-rating/browsingBehaviorRating.const";
import { Question } from "@src/shared/components/interaction/Question";
import { QUESTIONS } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { getRndEntry } from "@src/util/getRndEntry"; // once on app load

// once on app load

export const BrowsingBehaviorRatingInteraction: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getStep, setStep] = createSignal<number>(0);

  const [getBrowsingBehaviorRating, setBrowsingBehaviorRating] = createSignal<
    number | null
  >(null);

  const onSaveRating = async (rating: number) => {
    await rateCurrentBrowsingBehavior(rating);
    if (rating >= 4) {
      props.onSuccess();
    } else {
      setStep(1);
    }
  };
  const rndQuestion = getRndEntry(
    QUESTIONS.filter((q) =>
      [QID.BBH1, QID.BBH2, QID.BBH3, QID.BBH4, QID.BBH5].includes(q.id),
    ),
  );

  return (
    <div
      id="minded-6622-browsing-behavior-rating"
      onmousemove={props.onCancelCountdown}
    >
      <Switch>
        <Match when={getStep() === 0}>
          <div>
            <div class="minded-6622-txt-big">
              How would you rate your recent browsing behavior?
            </div>

            <div class="minded-6622-browsing-behavior-rating-btns">
              {BROWSING_BEHAVIOR_OPTIONS.map((opt) => (
                <div
                  class={
                    getBrowsingBehaviorRating() === opt.val
                      ? "minded-6622-browsing-behavior-rating-btn isSelected"
                      : "minded-6622-browsing-behavior-rating-btn"
                  }
                  onclick={() => {
                    setBrowsingBehaviorRating(opt.val);
                    onSaveRating(opt.val);
                  }}
                >
                  {opt.txt}
                </div>
              ))}
            </div>
          </div>
        </Match>
        <Match when={getStep() === 1}>
          <Question
            question={rndQuestion}
            onCancelCountdown={props.onCancelCountdown}
            onSuccess={() => props.onSuccess()}
            onSkip={() => undefined}
          />
        </Match>

        {/*<Match when={getStep() === 1}>*/}
        {/*  <Question*/}
        {/*    question={QUESTIONS.find((q) => q.id === QID.BBH1)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => setStep(2)}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
        {/*<Match when={getStep() === 2}>*/}
        {/*  <Question*/}
        {/*    question={QUESTIONS.find((q) => q.id === QID.BBH2)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => setStep(3)}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
        {/*<Match when={getStep() === 3}>*/}
        {/*  <Question*/}
        {/*    question={QUESTIONS.find((q) => q.id === QID.BBH3)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => setStep(4)}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
        {/*<Match when={getStep() === 4}>*/}
        {/*  <Question*/}
        {/*    question={QUESTIONS.find((q) => q.id === QID.BBH4)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => props.onSuccessSunTap()}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
      </Switch>
    </div>
  );
};

/* @refresh reload */
import { createSignal, For, JSX, Match, Switch } from "solid-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { rateCurrentBrowsingBehavior } from "@dataInterface/syncDataInterface";
import { BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/browsing-behavior-rating/browsingBehaviorRating.const";
import { Question } from "@src/shared/components/interaction/Question";
import { QUESTIONS } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { getRndEntry } from "@src/util/getRndEntry";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";

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

  const onNext = async () => {
    await rateCurrentBrowsingBehavior(getBrowsingBehaviorRating());
    if (getBrowsingBehaviorRating() >= 4) {
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
              {IS_ANDROID
                ? "How would you rate your recent usage of the apps you configured to use less?"
                : "How would you rate your recent browsing behavior?"}
            </div>
            <div class="minded-6622-browsing-behavior-rating-btns">
              <For each={BROWSING_BEHAVIOR_OPTIONS}>
                {(opt) => (
                  <div
                    class={
                      getBrowsingBehaviorRating() === opt.val
                        ? "btn-toggle-select isSelected"
                        : "btn-toggle-select"
                    }
                    onClick={() => {
                      setBrowsingBehaviorRating(opt.val);
                    }}
                  >
                    {opt.txt}
                  </div>
                )}
              </For>
            </div>
            <div
              class="btn-big"
              style={`margin-top: 32px; ${!getBrowsingBehaviorRating() ? "visibility: hidden" : ""}`}
              onclick={() => onNext()}
            >
              save
            </div>
          </div>
        </Match>
        <Match when={getStep() === 1}>
          <div class="fadeIn">
            <Question
              initialQuestion={rndQuestion}
              isChangeQuestion={false}
              answers={[]}
              onCancelCountdown={props.onCancelCountdown}
              onSuccess={() => props.onSuccess()}
              onSkip={() => undefined}
              onUpdateQuestion={() => undefined}
            />
          </div>
        </Match>

        {/*<Match when={getStep() === 1}>*/}
        {/*  <Question*/}
        {/*    initialQuestion={QUESTIONS.find((q) => q.id === QID.BBH1)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => setStep(2)}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
        {/*<Match when={getStep() === 2}>*/}
        {/*  <Question*/}
        {/*    initialQuestion={QUESTIONS.find((q) => q.id === QID.BBH2)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => setStep(3)}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
        {/*<Match when={getStep() === 3}>*/}
        {/*  <Question*/}
        {/*    initialQuestion={QUESTIONS.find((q) => q.id === QID.BBH3)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => setStep(4)}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
        {/*<Match when={getStep() === 4}>*/}
        {/*  <Question*/}
        {/*    initialQuestion={QUESTIONS.find((q) => q.id === QID.BBH4)}*/}
        {/*    onCancelCountdown={props.onCancelCountdown}*/}
        {/*    onSuccessSunTap={() => props.onSuccessSunTap()}*/}
        {/*    onSkip={() => undefined}*/}
        {/*  />*/}
        {/*</Match>*/}
      </Switch>
    </div>
  );
};

import { createSignal, JSX, Match, Switch } from "solid-js";
import {
  rateCurrentAppUsage,
  rateCurrentBrowsingBehavior,
} from "@src/dataInterface/commonSyncDataInterface";
import { APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/appUsageOrBrowsingBehavior.const";
import { Question } from "@src/shared/components/interaction/Question";
import { QUESTIONS } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { getRndEntry } from "@src/util/getRndEntry";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import TglBtns from "@src/shared/components/ui/TglBtns";

export const AppUsageOrBrowsingBehavior: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const [getStep, setStep] = createSignal<number>(0);

  const handleRatingSelect = async (rating: number) => {
    if (IS_ANDROID) {
      await rateCurrentAppUsage(rating);
    } else {
      await rateCurrentBrowsingBehavior(rating);
    }

    if (rating >= 4) {
      props.onSuccess();
    } else {
      setStep(1);
    }
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
      onmousemove={props.onCancelCountdown}
    >
      <Switch>
        <Match when={getStep() === 0}>
          <div>
            <div class="txtBig" style="padding-bottom:16px;">
              {IS_ANDROID
                ? "How would you rate your recent usage of the apps you configured to use less?"
                : "How would you rate your recent browsing behavior?"}
            </div>
            <div class="browsing-behavior-rating-btns">
              <TglBtns
                options={APP_USAGE_OR_BROWSING_BEHAVIOR_OPTIONS}
                onSelect={handleRatingSelect}
              />
            </div>
          </div>
        </Match>
        <Match when={getStep() === 1}>
          <div class="pageTransitionIn">
            <Question
              initialQuestion={rndQuestion}
              answers={[]}
              onCancelCountdown={props.onCancelCountdown}
              onSuccess={() => props.onSuccess()}
              onSkip={() => undefined}
              onUpdateQuestion={() => undefined}
            />
          </div>
        </Match>
      </Switch>
    </div>
  );
};

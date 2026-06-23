import { createSignal, Match, onCleanup, onMount, Switch } from "solid-js";
import Stepper from "@src/shared/components/ui/Stepper";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { Question } from "@src/shared/components/interaction/Question";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Answer } from "@src/dataInterface/syncData";
import {
  getSyncData,
  setDailyQuestionsDoneForToday,
} from "@src/dataInterface/commonSyncDataInterface";
import styles from "./DailyQuestions.module.scss";
import {
  DailyQuestionsMode,
  getDailyQuestionsMode,
} from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import { useNavigate } from "@solidjs/router";
import { navigateWithPageFadeOut } from "@src/util/animation";

const AFTER_ANI_WAIT_DURATION = 1100;

const DailyQuestions = () => {
  const navigate = useNavigate();
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getStep, setStep] = createSignal(0);

  const today = new Date();
  const isMonday = today.getDay() === 1;
  const mode: DailyQuestionsMode = getDailyQuestionsMode();
  // const mode: DailyQuestionsMode = "Evening";
  // Evening lost its opening mood check-in, so it's a 3-step flow now while
  // Morning keeps 4. Derive the stepper size and the final success ("🌞") step.
  const lastStep = mode === "Morning" ? 3 : 2;
  const nrOfSteps = lastStep + 1;
  let t0: NodeJS.Timeout | undefined;

  const getRndQuestionFromCat = (
    categoryId: QuestionCategoryId,
  ): QuestionForPrompt => {
    const questions = QUESTION_CATEGORIES[categoryId].questions;
    return {
      ...getRndEntry(questions || []),
      categoryId,
    };
  };

  onMount(() => {
    getSyncData().then((syncData) => {
      setAnswers(syncData.answers);
    });
  });

  onCleanup(() => {
    window.clearTimeout(t0);
  });

  const onSuccess = () => {
    setDailyQuestionsDoneForToday(mode);
  };

  const afterAni = () => {
    window.clearTimeout(t0);
    t0 = setTimeout(() => {
      navigateWithPageFadeOut(navigate, "/");
    }, AFTER_ANI_WAIT_DURATION);
  };

  // The success message arms afterAni once it mounts. Track the timer on `t0`
  // (the same one onCleanup clears) so leaving mid-celebration cancels it —
  // otherwise the stray timer would later fade whatever page the user moved on
  // to and yank them back to the dashboard.
  const scheduleAfterAni = () => {
    window.clearTimeout(t0);
    t0 = setTimeout(() => afterAni(), AFTER_ANI_WAIT_DURATION);
  };

  // TODO answers
  return (
    <div
      classList={{
        [styles.wrapper]: true,
        pageTransitionIn: true,
        pageWrapper: true,
      }}
    >
      <div class={styles.interactionWrapper}>
        {mode === "Morning" && (
          <Switch>
            <Match when={getStep() === 0}>
              <EnergyLvlInteraction
                onSuccess={() => setStep(1)}
                onSkip={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 1}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  isMonday
                    ? QuestionCategoryId.GoalForTheWeek
                    : QuestionCategoryId.RefocusHelperToday,
                )}
                answers={getAnswers()}
                onSuccess={() => setStep(2)}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 2}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  QuestionCategoryId.GoodPlansToday,
                )}
                answers={getAnswers()}
                onSuccess={() => {
                  onSuccess();
                  setStep(3);
                }}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 3}>
              {/* TODO component */}
              <div
                class="success-message"
                ref={scheduleAfterAni}
              >
                <div class="success-sun"></div>
                <div class="success-text">Have a wonderful day today!</div>
              </div>
            </Match>
          </Switch>
        )}

        {mode === "Evening" && (
          <Switch>
            <Match when={getStep() === 0}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  QuestionCategoryId.GoodToday,
                )}
                answers={getAnswers()}
                onSuccess={() => setStep(1)}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 1}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  QuestionCategoryId.TodayILearned,
                )}
                answers={getAnswers()}
                onSuccess={() => {
                  onSuccess();
                  setStep(2);
                }}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 2}>
              {/* TODO component */}
              <div
                class="success-message"
                ref={scheduleAfterAni}
              >
                <div class="success-sun"></div>
                <div class="success-text">
                  Have a wonderful rest of the day!
                </div>
              </div>
            </Match>
          </Switch>
        )}
      </div>

      <div
        class={styles.stepperWrapper}
        style={{ visibility: getStep() === lastStep ? "hidden" : "visible" }}
      >
        <Stepper
          nrOfSteps={nrOfSteps}
          activeStep={getStep()}
          isNoGoBack={true}
          onSetStep={(step) => setStep(step)}
          labelFn={(step) => (step === lastStep ? "🌞" : undefined)}
        />
      </div>
    </div>
  );
};
export default DailyQuestions;

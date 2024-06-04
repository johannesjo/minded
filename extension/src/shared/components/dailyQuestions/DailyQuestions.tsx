import { createSignal, Match, onMount, Switch } from "solid-js";
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
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { MoodCheckin } from "@src/shared/components/interaction/moodCheckin/MoodCheckin";
// @ts-ignore
import styles from "./DailyQuestions.module.scss";
import { getDailyQuestionsMode } from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import { useNavigate } from "@solidjs/router";
import { Ico } from "@src/shared/components/ui/Ico";

const DailyQuestions = () => {
  const navigate = useNavigate();
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getStep, setStep] = createSignal(0);

  const today = new Date();
  const isMonday = today.getDay() === 1;
  const mode = getDailyQuestionsMode();

  const getRndQuestionFromCat = (
    categoryId: QuestionCategoryId,
  ): QuestionForPrompt => {
    return {
      ...getRndEntry(QUESTION_CATEGORIES[categoryId].questions),
      categoryId,
    };
  };

  onMount(() => {
    getSyncData().then((syncData) => {
      setAnswers(syncData.answers);
    });
  });

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
        {mode === "DayStart" && (
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
                onSuccess={() => setStep(3)}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 3}>
              <div class="haveAWonderfulDayMsg">
                <div class="txtBig">
                  That's all! Have a wonderful day today! 🌞
                </div>
                <button
                  style="margin-top:32px;"
                  class="btnTxt"
                  onClick={() => navigate("/")}
                >
                  <Ico name="arrowBack" />
                </button>
              </div>
            </Match>
          </Switch>
        )}

        {mode === "DayEnd" && (
          <Switch>
            <Match when={getStep() === 0}>
              <MoodCheckin
                onSuccess={() => setStep(1)}
                onSkip={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 1}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  QuestionCategoryId.GoodToday,
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
                  QuestionCategoryId.TodayILearned,
                )}
                answers={getAnswers()}
                onSuccess={() => setStep(3)}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === 3}>
              <div class="haveAWonderfulDayMsg">
                <div class="txtBig">
                  That's all! Have a wonderful rest of the day and a refreshing
                  night!! 🌙
                </div>
                <button
                  style="margin-top:32px;"
                  class="btnTxt"
                  onClick={() => navigate("/")}
                >
                  <Ico name="arrowBack" />
                </button>
              </div>
            </Match>
          </Switch>
        )}
      </div>

      <div class={styles.stepperWrapper}>
        <Stepper
          nrOfSteps={4}
          activeStep={getStep()}
          isNoGoBack={true}
          onSetStep={(step) => setStep(step)}
          labelFn={(step) => (step === 3 ? "🌞" : undefined)}
        />
      </div>
    </div>
  );
};
export default DailyQuestions;

import {
  createEffect,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Switch,
} from "solid-js";
import {
  setSunOrbit,
  setSunRole,
} from "@src/shared/components/interaction/sun/sunStore";
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

const AFTER_ANI_WAIT_DURATION = 1100;

// The evening reflection's second step draws from a small pool of gentle,
// low-demand prompts instead of a single category, so no one question comes up
// every night. In particular the more effortful "Today I Learned" prompts -
// which read like an end-of-day performance review rather than a restful
// noticing - become just one occasional voice among letting-go, present-moment,
// self-compassion and calming prompts. Winding down should feel relaxing, never
// like homework.
const EVENING_WIND_DOWN_CATEGORIES: QuestionCategoryId[] = [
  QuestionCategoryId.LettingGo,
  QuestionCategoryId.NoticingNow,
  QuestionCategoryId.SelfCompassion,
  QuestionCategoryId.CalmingThoughts,
  QuestionCategoryId.TodayILearned,
];

const DailyQuestions = () => {
  const navigate = useNavigate();
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getStep, setStep] = createSignal(0);

  const today = new Date();
  const isMonday = today.getDay() === 1;
  const mode: DailyQuestionsMode = getDailyQuestionsMode();
  // Morning is an energy check-in, then today's gentle plans - with a
  // lightly-held weekly intention added on Mondays (4 steps Mon / 3 steps
  // otherwise). Evening lost its opening mood check-in, so it's 3 steps too.
  // The last step is the success beat; the rest are questions.
  const lastStep = mode === "Morning" ? (isMonday ? 3 : 2) : 2;
  // Every step before the success beat is one question; that count is also the
  // number of progress dots the sun wears as its crown.
  const nrOfQuestions = lastStep;
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

  // Pool the questions of several categories and pick one at random, tagging
  // each with its own category so the saved answer is still attributed
  // correctly. Used to give the evening step variety across gentle categories.
  const getRndQuestionFromCats = (
    categoryIds: QuestionCategoryId[],
  ): QuestionForPrompt => {
    const pool = categoryIds.flatMap((categoryId) =>
      (QUESTION_CATEGORIES[categoryId].questions || []).map((q) => ({
        ...q,
        categoryId,
      })),
    );
    return getRndEntry(pool);
  };

  onMount(() => {
    getSyncData().then((syncData) => {
      setAnswers(syncData.answers);
    });
  });

  // The one shell sun is this flow's through-line: it rests on the bottom bar
  // wearing a progress crown while the questions are answered, then blooms into
  // the closing sun. Driven reactively off the step so each transition is a
  // glide of the same disc - never a new element popping in (which is what made
  // the old separate suns jump).
  createEffect(() => {
    if (getStep() === lastStep) {
      setSunOrbit(null);
      setSunRole("dailyQuestionsSuccess");
    } else {
      setSunOrbit({ total: nrOfQuestions, filled: getStep() });
      setSunRole("dailyQuestions");
    }
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    // Hand the disc back to its companion rest - from the success bloom it
    // glides down to the bottom bar of the dashboard we navigate to.
    setSunOrbit(null);
    setSunRole("companion");
  });

  const onSuccess = () => {
    setDailyQuestionsDoneForToday(mode);
  };

  const afterAni = () => {
    window.clearTimeout(t0);
    t0 = setTimeout(() => {
      navigate("/");
    }, AFTER_ANI_WAIT_DURATION);
  };

  // The success message arms afterAni once it mounts. Track the timer on `t0`
  // (the same one onCleanup clears) so leaving mid-celebration cancels it -
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
            {/* Mondays open with a lightly-held weekly intention; other
                mornings go straight to today's gentle plans. */}
            <Match when={isMonday && getStep() === 1}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  QuestionCategoryId.GoalForTheWeek,
                )}
                answers={getAnswers()}
                onSuccess={() => setStep(2)}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === (isMonday ? 2 : 1)}>
              <Question
                initialQuestion={getRndQuestionFromCat(
                  QuestionCategoryId.GoodPlansToday,
                )}
                answers={getAnswers()}
                onSuccess={() => {
                  onSuccess();
                  setStep(lastStep);
                }}
                onSkip={() => undefined}
                onUpdateQuestion={() => undefined}
                onCancelCountdown={() => undefined}
              />
            </Match>
            <Match when={getStep() === lastStep}>
              {/* TODO component */}
              <div class="success-message" ref={scheduleAfterAni}>
                {/* No sun here: the shell sun blooms above this line. */}
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
                initialQuestion={getRndQuestionFromCats(
                  EVENING_WIND_DOWN_CATEGORIES,
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
              <div class="success-message" ref={scheduleAfterAni}>
                {/* No sun here: the shell sun blooms above this line. */}
                <div class="success-text">
                  Have a wonderful rest of the day!
                </div>
              </div>
            </Match>
          </Switch>
        )}
      </div>
    </div>
  );
};
export default DailyQuestions;

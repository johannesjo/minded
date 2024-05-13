// @ts-ignore
import styles from "./InteractionWindow.module.scss";
/* @refresh reload */
import { createSignal, Match, onMount, Switch } from "solid-js";
import { MoodCheckin } from "@src/shared/components/interaction/mood-checkin/MoodCheckin";
import { EmojiCheckin } from "@src/shared/components/interaction/emoji-checkin/EmojiCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energy-lvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";
// @ts-ignore
import { BrowsingBehaviorRatingInteraction } from "@src/shared/components/interaction/browsing-behavior-rating/BrowsingBehaviorRating";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { Answer } from "@src/dataInterface/syncData";
import { QuestionForPrompt, QUESTIONS } from "@src/shared/data/questions";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
import {
  getInteractionMode,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import { androidInterface } from "@src/dataInterface/android/system";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";

const ADVICE = getRndEntry(ACTION_ADVICES);

const InteractionWindow = () => {
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();

  const [getRndQuestion, setRndQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();

  let syncData;
  let questionUpdateCount = 0;
  let questionIdBefore;

  onMount(async () => {
    addDayTimeDependentClass();

    getSyncData().then((syncDataI) => {
      syncData = syncDataI;
      setMode(getInteractionMode(syncData));

      const rndQuestion = getQuestionSmart(syncDataI.answers);
      setRndQuestion(rndQuestion);
      questionIdBefore = rndQuestion.id;

      switch (getMode()) {
        case "ACTION_ADVICE":
          androidInterface.setLittleSunTxt(ADVICE.txt);
          setWasAnswerGiven(true);
          return;
        case "ENERGY_LVL":
          androidInterface.setLittleSunTxt(
            "How would you rate your energy level today?",
          );
          return;
        default:
          androidInterface.setLittleSunTxt(rndQuestion.t + "?");
      }
    });
  });

  const cancelCountdown = () => {};

  const onSuccess = (answerOrData?: Answer) => {
    cancelCountdown();
    // androidInterface.setLittleSunTxt(
    //   typeof answerOrData?.val === "string" ? answerOrData.val : "",
    // );
    // setWasAnswerGiven(true);
    // setIsShowSuccessSun(true);
    // showSuccessSunAniFlow();
    androidInterface.onSuccess();
  };

  const updateQuestion = () => {
    setMode("QUESTION");
    if (syncData) {
      const rndQuestion =
        questionUpdateCount >= 5
          ? getRndEntry(QUESTIONS)
          : getQuestionSmart(syncData.answers);
      androidInterface.setQuestion(rndQuestion);

      if (questionIdBefore === rndQuestion.id) {
        questionUpdateCount++;
        updateQuestion();
      } else {
        questionIdBefore = rndQuestion.id;
        setRndQuestion(rndQuestion);
        androidInterface.setLittleSunTxt(rndQuestion.t + "?");
        setWasAnswerGiven(false);
        questionUpdateCount++;
      }
    }
  };

  const okSkip = () => {
    androidInterface.onSkip();
  };

  // TODO add app name
  return (
    <div
      id="minded-6622-coloured-wrapper-dynamic"
      onClick={(ev) => {
        if (
          (ev.target as HTMLElement)?.id ===
          "minded-6622-coloured-wrapper-dynamic"
        ) {
          androidInterface.fadeOutMainFinal();
        }
      }}
    >
      <div id="minded-6622-box">
        <Switch>
          <Match when={getMode() === "MOOD_CHECKIN"}>
            <MoodCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={okSkip}
            />
          </Match>
          <Match when={getMode() === "EMOJI_CHECKIN"}>
            <EmojiCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={okSkip}
            />
          </Match>
          <Match when={getMode() === "ACTION_ADVICE"}>
            <div id="minded-6622-action-advice">
              <div>{ADVICE.txt}</div>
              <div>{ADVICE.ico}</div>
            </div>
          </Match>
          <Match when={getMode() === "ENERGY_LVL"}>
            <EnergyLvlInteraction
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={okSkip}
            />
          </Match>
          <Match when={getMode() === "BROWSING_BEHAVIOR_RATING"}>
            <BrowsingBehaviorRatingInteraction
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={okSkip}
            />
          </Match>
          <Match when={getMode() === "QUESTION"}>
            {getRndQuestion() && (
              <Question
                question={getRndQuestion()}
                onCancelCountdown={cancelCountdown}
                onSuccess={onSuccess}
                onChangeQuestion={() => updateQuestion()}
                onCancel={okSkip}
              />
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default InteractionWindow;

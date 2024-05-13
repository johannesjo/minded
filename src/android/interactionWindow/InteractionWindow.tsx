// @ts-ignore
import styles from "./InteractionWindow.module.scss";
/* @refresh reload */
import { createSignal, onMount } from "solid-js";
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
import { fadeOut } from "@src/util/animation";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";

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
  let wrapperEl;

  onMount(async () => {
    addDayTimeDependentClass();

    getSyncData().then((syncDataI) => {
      syncData = syncDataI;
      setMode(getInteractionMode(syncData));

      const rndQuestion = getQuestionSmart(syncDataI.answers);
      setRndQuestion(rndQuestion);
      androidInterface.setQuestion(JSON.stringify(rndQuestion));
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
      androidInterface.setQuestion(JSON.stringify(rndQuestion));

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

  const onSkip = () => {
    androidInterface.onSkip();
  };

  // TODO add app name
  return (
    <div
      ref={wrapperEl}
      id="minded-6622-coloured-wrapper-dynamic"
      onClick={async (ev) => {
        if (
          (ev.target as HTMLElement)?.id ===
          "minded-6622-coloured-wrapper-dynamic"
        ) {
          await fadeOut(wrapperEl, 400).promise;
          androidInterface.fadeOutMainFinal();
        }
      }}
    >
      <InteractionCommon
        mode={getMode()}
        onCancelCountdown={cancelCountdown}
        onSuccess={onSuccess}
        onSkip={onSkip}
        updateQuestion={updateQuestion}
        rndQuestion={getRndQuestion()}
      />
    </div>
  );
};

export default InteractionWindow;

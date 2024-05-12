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
import { closeTabOrApp } from "@dataInterface/system";
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
import { fadeOut } from "@src/util/animation";
import { stopAllVideos } from "@src/util/stopAllVideos";

const ADVICE = getRndEntry(ACTION_ADVICES);

const InteractionWindow = () => {
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getIsShowSuccessSun, setIsShowSuccessSun] = createSignal(false);
  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getLittleSunTxt, setLittleSunTxt] = createSignal<string>("");
  const [getRndQuestion, setRndQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();

  let wrapperEl;
  let frameNr;
  let syncData;
  let questionUpdateCount = 0;
  let questionIdBefore;

  onMount(async () => {
    // give a moment time for rendering
    setTimeout(() => {
      stopAllVideos();
    }, 1000);

    setTimeout(() => {
      stopAllVideos();
    }, 2000);

    setTimeout(() => {
      stopAllVideos();
    }, 5000);

    // setTimeout(() => {
    //   onSuccess();
    // }, 1000);

    getSyncData().then((syncDataI) => {
      syncData = syncDataI;
      setMode(getInteractionMode(syncData));

      const rndQuestion = getQuestionSmart(syncDataI.answers);
      setRndQuestion(rndQuestion);
      questionIdBefore = rndQuestion.id;

      switch (getMode()) {
        case "ACTION_ADVICE":
          setLittleSunTxt(ADVICE.txt);
          setWasAnswerGiven(true);
          return;
        case "ENERGY_LVL":
          setLittleSunTxt("How would you rate your energy level today?");
          return;
        default:
          setLittleSunTxt(rndQuestion.t + "?");
      }
    });
  });

  const cancelCountdown = () => {
    if (!frameNr) {
      return;
    }
    if (getIsShowSuccessSun()) {
      return;
    }

    window.cancelAnimationFrame(frameNr);
    if (wrapperEl) {
      wrapperEl.style.transition = `opacity 1000ms ease-out`;
      wrapperEl.style.opacity = "1";
    }
  };

  const onSuccess = (answerOrData?: Answer) => {
    cancelCountdown();
    setLittleSunTxt(
      typeof answerOrData?.val === "string" ? answerOrData.val : "",
    );
    setWasAnswerGiven(true);
    setIsShowSuccessSun(true);
    // showSuccessSunAniFlow();
  };

  const updateQuestion = () => {
    setMode("QUESTION");
    if (syncData) {
      const rndQuestion =
        questionUpdateCount >= 5
          ? getRndEntry(QUESTIONS)
          : getQuestionSmart(syncData.answers);

      if (questionIdBefore === rndQuestion.id) {
        questionUpdateCount++;
        updateQuestion();
      } else {
        questionIdBefore = rndQuestion.id;
        setRndQuestion(rndQuestion);
        setLittleSunTxt(rndQuestion.t + "?");
        setWasAnswerGiven(false);
        questionUpdateCount++;
      }
    }
  };

  const teardown = () => {
    document.removeEventListener("keypress", escapeHandler);
    // props.onHideAll();
  };

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      fadeOutMainFinal();
    }
  };

  const fadeOutMainFinal = () => {
    if (wrapperEl) {
      fadeOut(wrapperEl, 150).promise.then(() => {
        // littleSun();
      });
    } else {
      // littleSun();
    }
  };

  // TODO add app name
  return (
    <div id="minded-6622-coloured-wrapper" class={styles.NewTab}>
      <div id="minded-6622-box">
        <Switch>
          <Match when={getMode() === "MOOD_CHECKIN"}>
            <MoodCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={teardown}
            />
          </Match>
          <Match when={getMode() === "EMOJI_CHECKIN"}>
            <EmojiCheckin
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={teardown}
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
              onCancel={teardown}
            />
          </Match>
          <Match when={getMode() === "BROWSING_BEHAVIOR_RATING"}>
            <BrowsingBehaviorRatingInteraction
              onCancelCountdown={cancelCountdown}
              onSuccess={onSuccess}
              onCancel={teardown}
            />
          </Match>
          <Match when={getMode() === "QUESTION"}>
            {getRndQuestion() && (
              <Question
                question={getRndQuestion()}
                onCancelCountdown={cancelCountdown}
                onSuccess={onSuccess}
                onChangeQuestion={() => updateQuestion()}
                onCancel={teardown}
              />
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
};

export default InteractionWindow;

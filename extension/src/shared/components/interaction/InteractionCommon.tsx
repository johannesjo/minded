import {
  Component,
  createEffect,
  createSignal,
  Match,
  onMount,
  Switch,
} from "solid-js";
import { MoodCheckin } from "@src/shared/components/interaction/moodCheckin/MoodCheckin";
import { EmojiCheckin } from "@src/shared/components/interaction/emojiCheckin/EmojiCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { AppUsageOrBrowsingBehavior } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/AppUsageOrBrowsingBehavior";
import {
  getInteractionMode,
  InteractionMode,
} from "@src/shared/components/interaction/getInteractionMode";
import { Answer, SyncData } from "@src/dataInterface/syncData";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { fadeOut } from "@src/util/animation";
import { getQuestionSmart } from "@src/util/getQuestionSmart";
import SelfAssessmentInteraction from "@src/shared/components/interaction/selfAssessmentInteraction/SelfAssessmentInteraction";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import Sun from "@src/shared/components/interaction/sun/Sun";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import { ShowAlternativeInteraction } from "@src/shared/components/interaction/alternatives/ShowAlternative";
import { SetAlternativeInteraction } from "@src/shared/components/interaction/alternatives/SetAlternative";
import "./InteractionCommon.scss";

interface InteractionCommonProps {
  questionForPrompt?: QuestionForPrompt;
  isInitFadeout: boolean;
  wrapperEl: HTMLElement;
  onAfterInteractionFadeout: () => void;
  onSetAnswer: (txt: string) => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
  onModeSet: (mode: InteractionMode) => void;
  onInteractionSubmitted?: () => void;
  onSkip: () => void;
  onSwipeDown: () => void;
  onSwipeUp: () => void;
  onCompletionStarted?: (started: boolean) => void;
}

const ADVICE = getRndEntry(ACTION_ADVICES);

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  const [getAnswers, setAnswers] = createSignal<Answer[]>([]);
  const [getSyncDataI, setSyncDataI] = createSignal<SyncData>();
  const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getInitialQuestion, setInitialQuestion] = createSignal<
    QuestionForPrompt | undefined
  >();
  const [getShowBeProudMessage, setShowBeProudMessage] = createSignal(false);
  const [getInteractionOpacity, setInteractionOpacity] = createSignal(1);
  const [getIsContentReady, setIsContentReady] = createSignal(false);
  const [getIsSkipping, setIsSkipping] = createSignal(false);
  const [getIsFinalAnimation, setIsFinalAnimation] = createSignal(false);
  const [getIsDragging, setIsDragging] = createSignal(false);
  const [getShowSunInstructions, setShowSunInstructions] = createSignal(false);
  const [getHasAnswered, setHasAnswered] = createSignal(false);
  const [getPendingAnswer, setPendingAnswer] = createSignal<
    Answer | undefined
  >();
  const [getIsCompletionStarted, setIsCompletionStarted] = createSignal(false);

  // Handler for skip with fade-out animation
  const handleSkip = () => {
    if (getIsSkipping()) return; // Prevent multiple skip calls

    setIsSkipping(true);

    // If we're showing instructions, complete the interaction instead
    if (getShowSunInstructions()) {
      props.onInteractionSubmitted?.();
      cancelCountdown();
      // Then proceed with normal skip
    }

    // Check if we have a wrapper element (web extension case)
    if (props.wrapperEl) {
      // Use the fadeOut utility for web extension
      const { promise } = fadeOut(props.wrapperEl, 1000); // 1 second
      promise.then(() => {
        props.onSkip();
      });
    } else {
      // Fade out the interaction content for mobile apps
      let startTime = Date.now();
      const fadeOutDuration = 1000; // 1 second

      const fadeOutContent = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / fadeOutDuration, 1);
        const opacity = 1 - progress;

        setInteractionOpacity(opacity);

        if (progress < 1) {
          requestAnimationFrame(fadeOutContent);
        } else {
          // Call the original skip handler after fade out
          props.onSkip();
        }
      };

      fadeOutContent();
    }
  };

  // Handler to trigger background animations from sun component
  const handleStartBackgroundAnimation = (direction: "up" | "down") => {
    // Mark final animation as started
    setIsFinalAnimation(true);

    // Fade out the interaction content first
    let startTime = Date.now();
    const fadeOutDuration = 1000; // 1 second
    const startOpacity = getInteractionOpacity(); // Start from current opacity

    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      const opacity = startOpacity * (1 - progress); // Fade from current opacity to 0

      setInteractionOpacity(opacity);

      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        // If we were showing instructions, complete the interaction
        if (getShowSunInstructions()) {
          props.onInteractionSubmitted?.();
          cancelCountdown();
        }

        // Show "Be proud" message after a longer delay for better timing
        setTimeout(() => {
          setShowBeProudMessage(true);
        }, 1000); // Additional 1 second delay after fade out
      }
    };

    fadeOut();

    const event = new CustomEvent("startBackgroundAnimation", {
      detail: { direction },
    });
    window.dispatchEvent(event);
  };

  let frameNr;

  onMount(async () => {
    if (props.isInitFadeout) {
      setTimeout(() => {
        initFadeOut();
      }, 200);
    }

    getSyncData().then((syncData) => {
      setSyncDataI(syncData);
      setAnswers(syncData.answers);
      if (props.questionForPrompt) {
        setInitialQuestion(props.questionForPrompt);
        setMode("QUESTION");
      } else {
        const question = getQuestionSmart(syncData.answers);
        const mode = getInteractionMode(syncData);
        setInitialQuestion(question);
        setMode(mode);
      }

      // Trigger fade-in animation after content is ready
      setTimeout(() => {
        setIsContentReady(true);
      }, 100);
    });

    // Listen for drag progress events to fade content
    const handleDragProgress = (event: CustomEvent) => {
      const { intensity, isDragging, resetToInitial } = event.detail;
      const DRAG_THRESHOLD = 0.1; // Same as in Sun.tsx

      setIsDragging(isDragging);

      if (isDragging) {
        if (intensity >= DRAG_THRESHOLD) {
          // Fade to 0 when threshold is reached
          setInteractionOpacity(0);
        } else {
          // Gradually fade as approaching threshold
          // Map intensity (0 to threshold) to opacity (1 to 0)
          const normalizedProgress = intensity / DRAG_THRESHOLD;
          const opacity = Math.max(0, 1 - normalizedProgress);
          setInteractionOpacity(opacity);
        }
      } else if (resetToInitial) {
        // Only reset opacity when explicitly told to (snap back case)
        setInteractionOpacity(1);
      }
      // Otherwise, keep current opacity (for completion animation)
    };

    window.addEventListener("dragProgress", handleDragProgress);

    return () => {
      window.removeEventListener("dragProgress", handleDragProgress);
    };
  });

  createEffect(() => {
    if (getMode()) {
      props.onModeSet(getMode());
    }
  });

  createEffect(() => {
    if (getInitialQuestion()) {
      props.onUpdateQuestion(getInitialQuestion());
    }
  });

  const onInteractionSuccess = (answerOrData?: Answer) => {
    // Mark that user has answered
    setHasAnswered(true);

    // Fade out the interaction content first
    let startTime = Date.now();
    const fadeOutDuration = 700; // Faster fade out
    const startOpacity = getInteractionOpacity(); // Start from current opacity

    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      const opacity = startOpacity * (1 - progress); // Fade from current opacity to 0

      setInteractionOpacity(opacity);

      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        // Save the answer for later
        if (answerOrData) {
          setPendingAnswer(answerOrData);
          props.onSetAnswer(answerOrData.val.toString());
        }

        // Show sun instructions after answering
        setShowSunInstructions(true);
        // Fade instructions in after a longer delay for smoother transition
        setTimeout(() => {
          setInteractionOpacity(1);
        }, 600);
      }
    };

    fadeOut();
  };

  const cancelCountdown = () => {
    if (!frameNr) {
      return;
    }
    window.cancelAnimationFrame(frameNr);
    if (props.wrapperEl) {
      props.wrapperEl.style.transition = `opacity 1000ms ease-out`;
      props.wrapperEl.style.opacity = "1";
    }
  };

  const initFadeOut = () => {
    const res = fadeOut(props.wrapperEl, 5000, 2000);
    frameNr = res.frameNr;
    res.promise.then(() => {
      if (+props.wrapperEl.style.opacity < 0.1) {
        props.onAfterInteractionFadeout();
      }
    });
  };

  return (
    <>
      <BackgroundTransition dragThreshold={0.3} />

      {/* Be proud message during final animation */}
      {getShowBeProudMessage() && <div class="be-proud-message">Be proud!</div>}

      <div
        id="minded-6622-interaction-wrapper-box"
        style={{
          "pointer-events":
            getIsFinalAnimation() || getIsCompletionStarted() ? "none" : "auto",
        }}
      >
        <div
          className="interaction-content"
          classList={{
            "fade-in": getIsContentReady(),
            dragging: getIsDragging(),
          }}
          style={{
            opacity: getShowSunInstructions() ? 0 : getInteractionOpacity(),
            "pointer-events":
              getShowSunInstructions() || getIsCompletionStarted()
                ? "none"
                : "auto",
          }}
        >
          <Switch>
            <Match when={getMode() === "SELF_ASSESSMENT"}>
              {getSyncDataI() && (
                <SelfAssessmentInteraction
                  syncData={getSyncDataI()}
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onInteractionSuccess}
                  onSkip={handleSkip}
                />
              )}
            </Match>
            <Match when={getMode() === "MOOD_CHECKIN"}>
              <MoodCheckin
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onSkip={handleSkip}
              />
            </Match>
            <Match when={getMode() === "EMOJI_CHECKIN"}>
              <EmojiCheckin
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onSkip={handleSkip}
              />
            </Match>
            <Match when={getMode() === "ACTION_ADVICE"}>
              <div
                id="minded-6622-action-advice"
                className="txtBig"
                style="pointer-events:none;"
              >
                <div>{ADVICE.txt}</div>
                <div>{ADVICE.ico}</div>
              </div>
            </Match>
            <Match when={getMode() === "ENERGY_LVL"}>
              <EnergyLvlInteraction
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onSkip={handleSkip}
              />
            </Match>
            <Match when={getMode() === "SHOW_ALTERNATIVE"}>
              <ShowAlternativeInteraction
                syncData={getSyncDataI()}
                onCancelCountdown={cancelCountdown}
                onSkip={handleSkip}
              />
            </Match>
            <Match when={getMode() === "SET_ALTERNATIVE"}>
              <SetAlternativeInteraction
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onSkip={handleSkip}
              />
            </Match>
            <Match when={getMode() === "APP_USAGE_OR_BROWSING_BEHAVIOR"}>
              <AppUsageOrBrowsingBehavior
                onCancelCountdown={cancelCountdown}
                onSuccess={onInteractionSuccess}
                onSkip={handleSkip}
              />
            </Match>
            <Match when={getMode() === "QUESTION"}>
              {getInitialQuestion() && (
                <Question
                  isChangeQuestion={true}
                  initialQuestion={getInitialQuestion()}
                  answers={getAnswers()}
                  onCancelCountdown={cancelCountdown}
                  onSuccess={onInteractionSuccess}
                  onUpdateQuestion={(question) =>
                    props.onUpdateQuestion(question)
                  }
                  onSkip={handleSkip}
                />
              )}
            </Match>
          </Switch>
        </div>

        {/* Sun instructions overlay */}
        {getShowSunInstructions() && !getIsCompletionStarted() && (
          <div
            className="interaction-content sun-instructions-overlay"
            classList={{
              "fade-in": getShowSunInstructions(),
              dragging: getIsDragging(),
            }}
            style={{
              opacity: getInteractionOpacity(),
              "pointer-events": getIsCompletionStarted() ? "none" : "auto",
            }}
          >
            <div className="sun-instructions txtSmaller">
              <p>Drag the sun up to let go.</p>
              <p>Drag the sun down to relax.</p>
              <p>Tap the sun 5 times to proceed.</p>
            </div>
          </div>
        )}

        <div className="sun-container">
          <Sun
            onSkip={handleSkip}
            onSwipeDown={props.onSwipeDown}
            onSwipeUp={props.onSwipeUp}
            onStartBackgroundAnimation={handleStartBackgroundAnimation}
            onCompletionStarted={(started) => {
              setIsCompletionStarted(started);
              props.onCompletionStarted?.(started);
            }}
          />
        </div>
      </div>
    </>
  );
};

export default InteractionCommon;

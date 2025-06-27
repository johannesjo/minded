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
  const [getTextOpacity, setTextOpacity] = createSignal(1);

  // Handler for skip with fade-out animation
  const handleSkip = () => {
    if (getIsSkipping()) return; // Prevent multiple skip calls
    
    setIsSkipping(true);
    
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
    // Fade out the interaction content first
    let startTime = Date.now();
    const fadeOutDuration = 1000; // 1 second
    const startOpacity = getInteractionOpacity(); // Start from current opacity
    const startTextOpacity = getTextOpacity(); // Get current text opacity
    
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      const opacity = startOpacity * (1 - progress); // Fade from current opacity to 0
      const textOpacity = startTextOpacity * (1 - progress); // Fade text from current opacity to 0
      
      setInteractionOpacity(opacity);
      setTextOpacity(textOpacity);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
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

    // Listen for drag progress events to fade text
    const handleDragProgress = (event: CustomEvent) => {
      const { intensity, isDragging, resetToInitial } = event.detail;
      if (isDragging) {
        // Immediately drop to 0.3 opacity, then fade from there
        const baseOpacity = 0.3;
        const fadePower = 2; // Smooth fade curve from 0.3 to 0
        const opacity = Math.max(0, baseOpacity * (1 - Math.pow(intensity, fadePower)));
        setTextOpacity(opacity);
      } else if (resetToInitial) {
        // Only reset opacity when explicitly told to (snap back case)
        setTextOpacity(1);
      }
      // Otherwise, keep current opacity (for completion animation)
    };

    window.addEventListener('dragProgress', handleDragProgress);

    return () => {
      window.removeEventListener('dragProgress', handleDragProgress);
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
    // Fade out the interaction content first
    let startTime = Date.now();
    const fadeOutDuration = 1000; // 1 second
    const startOpacity = getInteractionOpacity(); // Start from current opacity
    const startTextOpacity = getTextOpacity(); // Get current text opacity
    
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fadeOutDuration, 1);
      const opacity = startOpacity * (1 - progress); // Fade from current opacity to 0
      const textOpacity = startTextOpacity * (1 - progress); // Fade text from current opacity to 0
      
      setInteractionOpacity(opacity);
      setTextOpacity(textOpacity);
      
      if (progress < 1) {
        requestAnimationFrame(fadeOut);
      } else {
        // Call the original success handlers after fade out
        props.onInteractionSubmitted?.();
        cancelCountdown();

        if (answerOrData) {
          props.onSetAnswer(answerOrData.val.toString());
        }
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

      <div id="minded-6622-interaction-wrapper-box">
        {/* Be proud message during final animation */}
        {getShowBeProudMessage() && (
          <div class="be-proud-message">Be proud!</div>
        )}

        <div class="sun-container">
          <Sun
            onSkip={handleSkip}
            onSwipeDown={props.onSwipeDown}
            onSwipeUp={props.onSwipeUp}
            onStartBackgroundAnimation={handleStartBackgroundAnimation}
            dragThreshold={0.3}
          />
        </div>

        <div 
          class="interaction-content"
          classList={{ "fade-in": getIsContentReady() }}
          style={{ 
            opacity: getInteractionOpacity(),
            "--text-opacity": getTextOpacity()
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
              class="txtBig"
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
      </div>
    </>
  );
};

export default InteractionCommon;

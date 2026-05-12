import { Component, Match, Switch } from "solid-js";
import { MoodCheckin } from "@src/shared/components/interaction/moodCheckin/MoodCheckin";
import { EmojiCheckin } from "@src/shared/components/interaction/emojiCheckin/EmojiCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { AppUsageOrBrowsingBehavior } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/AppUsageOrBrowsingBehavior";
import { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import { Answer, SyncData } from "@src/dataInterface/syncData";
import {
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import SelfAssessmentInteraction from "@src/shared/components/interaction/selfAssessmentInteraction/SelfAssessmentInteraction";
import { ShowAlternativeInteraction } from "@src/shared/components/interaction/alternatives/ShowAlternative";
import { SetAlternativeInteraction } from "@src/shared/components/interaction/alternatives/SetAlternative";
import { EmotionLabeling } from "@src/shared/components/interaction/emotionLabeling/EmotionLabeling";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { getRndEntry } from "@src/util/getRndEntry";
import { IS_APP } from "@src/dataInterface/commonSyncDataInterface";

// Get random advice once at module load
const ADVICE = getRndEntry(ACTION_ADVICES);

export interface InteractionModeSwitchProps {
  mode: InteractionMode | undefined;
  syncData: SyncData | undefined;
  initialQuestion: QuestionForPrompt | undefined;
  answers: Answer[];
  onCancelCountdown: () => void;
  onSuccess: (answer?: Answer) => void;
  onSkip: () => void;
  onStayBriefly?: () => void;
  onAddBetterAlternative?: () => void;
  onUpdateQuestion: (question: QuestionForPrompt) => void;
}

/**
 * Renders the appropriate interaction component based on the current mode.
 * Extracted from InteractionCommon to reduce complexity.
 */
export const InteractionModeSwitch: Component<InteractionModeSwitchProps> = (
  props,
) => {
  return (
    <Switch>
      <Match when={props.mode === "SELF_ASSESSMENT"}>
        {props.syncData && (
          <SelfAssessmentInteraction
            syncData={props.syncData}
            onCancelCountdown={props.onCancelCountdown}
            onSuccess={props.onSuccess}
            onSkip={props.onSkip}
          />
        )}
      </Match>
      <Match when={props.mode === "EMOTION_LABELING"}>
        <EmotionLabeling
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "MOOD_CHECKIN"}>
        <MoodCheckin
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "EMOJI_CHECKIN"}>
        <EmojiCheckin
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "ACTION_ADVICE"}>
        <div
          id="minded-6622-action-advice"
          class="txtBig"
          style="pointer-events:none;"
        >
          <div>{ADVICE.txt}</div>
          <div>{ADVICE.ico}</div>
        </div>
      </Match>
      <Match when={props.mode === "ENERGY_LVL"}>
        <EnergyLvlInteraction
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "SHOW_ALTERNATIVE"}>
        {props.syncData && (
          <ShowAlternativeInteraction
            syncData={props.syncData}
            onCancelCountdown={props.onCancelCountdown}
            onSkip={props.onSkip}
            onStayBriefly={props.onStayBriefly}
            onAddBetterAlternative={props.onAddBetterAlternative}
          />
        )}
      </Match>
      <Match when={props.mode === "SET_ALTERNATIVE"}>
        <SetAlternativeInteraction
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "APP_USAGE_OR_BROWSING_BEHAVIOR"}>
        <AppUsageOrBrowsingBehavior
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "SHOW_REASON"}>
        {(() => {
          const reasonAnswers =
            props.syncData?.answers.filter(
              (a) =>
                a.questionCategoryId ===
                (IS_APP
                  ? QuestionCategoryId.WhyReduceAppUsage
                  : QuestionCategoryId.WhyReduceBrowsing),
            ) ?? [];
          const reason = getRndEntry(reasonAnswers);
          return reason ? (
            <div class="txtBig" style="pointer-events:none;">
              <div style="opacity: 0.7; font-size: 0.8em; margin-bottom: 0.5em;">
                Remember why you're here
              </div>
              <div style="font-style: italic;">"{reason.val}"</div>
            </div>
          ) : null;
        })()}
      </Match>
      <Match when={props.mode === "QUESTION"}>
        {props.initialQuestion && (
          <Question
            isChangeQuestion={true}
            initialQuestion={props.initialQuestion}
            answers={props.answers}
            onCancelCountdown={props.onCancelCountdown}
            onSuccess={props.onSuccess}
            onUpdateQuestion={props.onUpdateQuestion}
            onSkip={props.onSkip}
          />
        )}
      </Match>
    </Switch>
  );
};

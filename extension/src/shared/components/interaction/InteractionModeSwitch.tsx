import { Component, Match, Switch } from "solid-js";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energyLvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { AppUsageOrBrowsingBehavior } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/AppUsageOrBrowsingBehavior";
import { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import { Alternative, Answer, SyncData } from "@src/dataInterface/syncData";
import {
  QuestionCategoryId,
  QuestionForPrompt,
} from "@src/shared/data/questions";
import { ShowAlternativeInteraction } from "@src/shared/components/interaction/alternatives/ShowAlternative";
import { SetAlternativeInteraction } from "@src/shared/components/interaction/alternatives/SetAlternative";
import { EmotionLabeling } from "@src/shared/components/interaction/emotionLabeling/EmotionLabeling";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
import { getRndEntry } from "@src/util/getRndEntry";
import { IS_APP } from "@src/dataInterface/commonSyncDataInterface";
import { PatternInsightInteraction } from "@src/shared/components/interaction/patternInsight/PatternInsightInteraction";
import { ScreenOffInteraction } from "@src/shared/components/interaction/screenOff/ScreenOffInteraction";
import { UrgeSurfing } from "@src/shared/components/interaction/urgeSurfing/UrgeSurfing";
import { NoticeInteraction } from "@src/shared/components/interaction/notice/NoticeInteraction";
import type { PatternInsight } from "@src/shared/components/interaction/patternInsight/patternInsight";
import type { FrictionLevel } from "@src/shared/components/interaction/interactionContext";

export interface InteractionModeSwitchProps {
  mode: InteractionMode | undefined;
  frictionLevel: FrictionLevel;
  syncData: SyncData | undefined;
  initialQuestion: QuestionForPrompt | undefined;
  answers: Answer[];
  /** Short name of the site/app this interaction is about, if known. */
  targetName?: string;
  patternInsight: PatternInsight | undefined;
  onCancelCountdown: () => void;
  onSuccess: (answer?: Answer) => void;
  onSkip: () => void;
  onLeaveNow: () => void;
  /** Drive the real sun through a slow breath of `seconds` (urge surfing's wave). */
  onSunWaveStart: (seconds: number) => void;
  /** Return the real sun from its wave breath to the interactive disc. */
  onSunWaveEnd: () => void;
  alternativeToReplace?: Alternative;
  onAddBetterAlternative?: (alternative: Alternative) => void;
  onShowAlternativeFromPatternInsight?: () => void;
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
      <Match when={props.mode === "EMOTION_LABELING"}>
        <EmotionLabeling
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={props.onSuccess}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "NOTICE"}>
        <NoticeInteraction
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={() => props.onSuccess()}
          onSkip={props.onSkip}
        />
      </Match>
      <Match when={props.mode === "ACTION_ADVICE"}>
        {(() => {
          // Pick fresh each time this interaction mounts so repeated
          // action-advice prompts vary instead of showing one pinned line.
          const advice = getRndEntry(ACTION_ADVICES);
          return (
            <div
              id="minded-6622-action-advice"
              class="txtBig interaction-static-text"
            >
              <div>{advice.txt}</div>
              <div>{advice.ico}</div>
            </div>
          );
        })()}
      </Match>
      <Match when={props.mode === "SCREEN_OFF"}>
        <ScreenOffInteraction
          onSkip={props.onSkip}
          onCancelCountdown={props.onCancelCountdown}
          onLeaveNow={props.onLeaveNow}
        />
      </Match>
      <Match when={props.mode === "URGE_SURFING"}>
        <UrgeSurfing
          frictionLevel={props.frictionLevel}
          onCancelCountdown={props.onCancelCountdown}
          onSuccess={() => props.onSuccess()}
          onSkip={props.onSkip}
          onSunWaveStart={props.onSunWaveStart}
          onSunWaveEnd={props.onSunWaveEnd}
        />
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
            onAddBetterAlternative={props.onAddBetterAlternative}
          />
        )}
      </Match>
      <Match when={props.mode === "SET_ALTERNATIVE"}>
        <SetAlternativeInteraction
          currentAlternative={props.alternativeToReplace}
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
            <div class="txtBig interaction-static-text">
              <div class="interaction-caption">Remember why you're here</div>
              <div class="interaction-quote">"{reason.val}"</div>
            </div>
          ) : null;
        })()}
      </Match>
      <Match when={props.mode === "PATTERN_INSIGHT"}>
        {props.patternInsight && (
          <PatternInsightInteraction
            insight={props.patternInsight}
            onCancelCountdown={props.onCancelCountdown}
            onStillOnPurpose={() => props.onSuccess()}
            onShowAlternative={() =>
              props.onShowAlternativeFromPatternInsight?.()
            }
            onLeaveNow={props.onLeaveNow}
          />
        )}
      </Match>
      <Match when={props.mode === "QUESTION"}>
        {props.initialQuestion && (
          <Question
            initialQuestion={props.initialQuestion}
            answers={props.answers}
            targetName={props.targetName}
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

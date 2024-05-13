import { Component, Match, Switch } from "solid-js";
import { MoodCheckin } from "@src/shared/components/interaction/mood-checkin/MoodCheckin";
import { EmojiCheckin } from "@src/shared/components/interaction/emoji-checkin/EmojiCheckin";
import { EnergyLvlInteraction } from "@src/shared/components/interaction/energy-lvl/EnergyLvlInteraction";
import { Question } from "@src/shared/components/interaction/Question";
import { BrowsingBehaviorRatingInteraction } from "@src/shared/components/interaction/browsing-behavior-rating/BrowsingBehaviorRating";
import { InteractionMode } from "@src/shared/components/interaction/getInteractionMode";
import { Answer } from "@src/dataInterface/syncData";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { getRndEntry } from "@src/util/getRndEntry";
import { ACTION_ADVICES } from "@src/shared/data/actionAdvices";
// @ts-ignore
import { getSyncData } from "@dataInterface/syncDataInterface";

interface InteractionCommonProps {
  mode: InteractionMode;
  onCancelCountdown: () => void;
  onSuccess: (answerOrData?: Answer) => void;
  onSkip: () => void;
  updateQuestion: () => void;
  rndQuestion: QuestionForPrompt;
}

const ADVICE = getRndEntry(ACTION_ADVICES);

const InteractionCommon: Component<InteractionCommonProps> = (props) => {
  return (
    <div id="minded-6622-box">
      <Switch>
        <Match when={props.mode === "MOOD_CHECKIN"}>
          <MoodCheckin
            onCancelCountdown={props.onCancelCountdown}
            onSuccess={props.onSuccess}
            onSKip={props.onSkip}
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
          <div id="minded-6622-action-advice">
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
        <Match when={props.mode === "BROWSING_BEHAVIOR_RATING"}>
          <BrowsingBehaviorRatingInteraction
            onCancelCountdown={props.onCancelCountdown}
            onSuccess={props.onSuccess}
            onSkip={props.onSkip}
          />
        </Match>
        <Match when={props.mode === "QUESTION"}>
          {props.rndQuestion && (
            <Question
              question={props.rndQuestion}
              onCancelCountdown={props.onCancelCountdown}
              onSuccess={props.onSuccess}
              onChangeQuestion={props.updateQuestion}
              onSkip={props.onSkip}
            />
          )}
        </Match>
      </Switch>
    </div>
  );
};

export default InteractionCommon;

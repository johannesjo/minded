import { createSignal, For, JSX } from "solid-js";
import { markPatternInsightShown } from "@src/dataInterface/commonSyncDataInterface";
import {
  getPatternInsightActionLabel,
  type PatternInsight,
  type PatternInsightAction,
} from "@src/shared/components/interaction/patternInsight/patternInsight";
import Btn from "@src/shared/components/ui/Btn";
import styles from "./PatternInsightInteraction.module.scss";
import { VoiceReveal } from "@src/shared/components/interaction/voiceReveal/VoiceReveal";
import { voiceFollowStyle } from "@src/shared/components/interaction/voiceReveal/voiceRevealTiming";

export const PatternInsightInteraction: (props: {
  insight: PatternInsight;
  onStillOnPurpose: () => void;
  onShowAlternative: () => void;
  onLeaveNow: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  let markedInsightId: string | undefined;
  const [getIsActionSubmitted, setIsActionSubmitted] = createSignal(false);

  const markInsightShownOnce = async (): Promise<void> => {
    const insight = props.insight;
    if (markedInsightId === insight.id) {
      return;
    }

    markedInsightId = insight.id;
    await markPatternInsightShown(insight).catch((error) => {
      console.error("Failed to mark pattern insight shown", error);
    });
  };

  const handleAction = async (action: PatternInsightAction) => {
    if (getIsActionSubmitted()) {
      return;
    }

    setIsActionSubmitted(true);
    props.onCancelCountdown();
    await markInsightShownOnce();

    switch (action) {
      case "still_on_purpose":
        props.onStillOnPurpose();
        return;
      case "show_alternative":
        props.onShowAlternative();
        return;
      case "leave_now":
        props.onLeaveNow();
        return;
    }
  };

  return (
    <div
      class="voice-follow-scope"
      style={voiceFollowStyle(props.insight.message)}
      onmouseenter={props.onCancelCountdown}
    >
      <VoiceReveal
        class="txtBig interaction-heading"
        text={props.insight.message}
      />

      <div class={`${styles.actions} voice-follow`}>
        <For each={props.insight.actions}>
          {(action) => (
            <Btn
              disabled={getIsActionSubmitted()}
              onClick={() => void handleAction(action)}
            >
              {getPatternInsightActionLabel(action)}
            </Btn>
          )}
        </For>
      </div>
    </div>
  );
};

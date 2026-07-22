import { createSignal, For, JSX } from "solid-js";
import { markPatternInsightShown } from "@src/dataInterface/commonSyncDataInterface";
import {
  getPatternInsightActionLabel,
  type PatternInsight,
  type PatternInsightAction,
} from "@src/shared/components/interaction/patternInsight/patternInsight";
import Btn from "@src/shared/components/ui/Btn";
import styles from "./PatternInsightInteraction.module.scss";

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
    <div onmouseenter={props.onCancelCountdown}>
      <div class="txtBig interaction-heading">{props.insight.message}</div>

      <div class={styles.actions}>
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

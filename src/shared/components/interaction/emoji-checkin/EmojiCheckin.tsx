import {
  EMOIJI_CATEGORIES,
  EMOIJI_CATEGORIES_SORTED,
  EmojiCategory,
} from "@src/shared/components/interaction/emoji-checkin/emojis.const";
import { JSX } from "solid-js";

export const EmojiCheckin: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSetRating = async (val: number) => {
    // await saveAnswer({
    //   id: nanoid(),
    //   val,
    //   qid: null,
    //   ts: Date.now(),
    //   questionCategoryId: props.questionCategoryId,
    // });

    props.onSuccess();
  };

  return (
    <div
      id="minded-6622-energy-lvl-interaction"
      onmouseenter={props.onCancelCountdown}
    >
      <div style="pointer-events: all;">How do you feel?</div>

      <div>
        {EMOIJI_CATEGORIES_SORTED.map((catid) => (
          <div style="padding-bottom: 16px; pointer-events: all; display: inline-block;">
            {EMOIJI_CATEGORIES[catid].map((entry) => (
              <div
                style="display: inline-block; font-size: 40px; padding: 4px; cursor: pointer; pointer-events: all;"
                title={entry.d}
                onclick={props.onSuccess}
              >
                {entry.i}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

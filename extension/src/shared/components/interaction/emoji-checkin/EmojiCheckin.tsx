import {
  EMOIJI_CATEGORIES,
  EMOIJI_CATEGORIES_SORTED,
} from "@src/shared/components/interaction/emoji-checkin/emojis.const";
import { JSX } from "solid-js";

export const EmojiCheckin: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSetRating = async (val: number) => {
    // await saveAnswer({
    //   val: nanoid(),
    //   val,
    //   qid: null,
    //   ts: Date.now(),
    //   questionCategoryId: props.questionCategoryId,
    // });

    props.onSuccess();
  };

  return (
    <div class="emoji-checkin-wrapper" onmouseenter={props.onCancelCountdown}>
      <div class="txtBig">How do you feel?</div>

      <div>
        {EMOIJI_CATEGORIES_SORTED.map((catid) => (
          <div class="emoji-category">
            {EMOIJI_CATEGORIES[catid].map((entry) => (
              <div class="emoji" title={entry.d} onclick={props.onSuccess}>
                {entry.i}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

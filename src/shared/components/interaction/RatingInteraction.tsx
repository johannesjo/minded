/* @refresh reload */
import { JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
import { saveAnswer } from "@src/shared/data/syncDataInterface";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { nanoid } from "nanoid";
import { QID } from "@src/shared/data/questionId";

// once on app load

export const RatingInteraction: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  questionCategoryId: QuestionCategoryId;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSetRating = async (val: number) => {
    await saveAnswer({
      id: nanoid(),
      val,
      qid: null,
      ts: Date.now(),
      questionCategoryId: props.questionCategoryId,
    });
    props.onSuccess();
  };

  return (
    <div
      id="minded-6622-rating-interaction"
      onmouseenter={props.onCancelCountdown}
    >
      <div>How would you rate your energy level today?</div>
      <Rating onSetRating={onSetRating} />
    </div>
  );
};

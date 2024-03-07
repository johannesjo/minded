/* @refresh reload */
import { JSX } from "solid-js";
import Rating from '@src/shared/components/ui/Rating';
import { saveAnswer } from '@src/shared/data/dataInterface';
import { QuestionCategoryId } from '@src/shared/data/questions';

// once on app load

export const RatingInteraction: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {

  const onSetRating = async (val: number) => {
    await saveAnswer({val, ts: Date.now(), questionCategoryId: QuestionCategoryId.XEnergyLevel});
    props.onSuccess();
  };

  return (
    <div id="minded-6622-rating-interaction"
         onmouseenter={props.onCancelCountdown}>
      <div>How would you rate your energy level today?</div>
      <Rating onSetRating={onSetRating} />
    </div>
  );
};

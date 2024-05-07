/* @refresh reload */
import { JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
import { saveEnergyLvl } from "@src/shared/data/syncDataInterface";
import { QuestionCategoryId } from "@src/shared/data/questions";

// once on app load

export const EnergyLvlInteraction: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  questionCategoryId: QuestionCategoryId;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSetRating = async (val: number) => {
    await saveEnergyLvl(val);
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

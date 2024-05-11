/* @refresh reload */
import { JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
import { saveEnergyLvl } from "@src/shared/data/syncDataInterface";

// once on app load

export const EnergyLvlInteraction: (props: {
  onSuccess: () => void;
  onCancel: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSetRating = async (val: number) => {
    await saveEnergyLvl(val);
    props.onSuccess();
  };

  return (
    <div
      id="minded-6622-energy-lvl-interaction"
      onmouseenter={props.onCancelCountdown}
    >
      <div>How would you rate your energy level today?</div>
      <Rating onSetRating={onSetRating} />
    </div>
  );
};

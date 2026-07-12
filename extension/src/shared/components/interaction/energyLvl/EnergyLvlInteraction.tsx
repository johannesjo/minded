/* @refresh reload */
import { JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
import { saveEnergyLvl } from "@src/dataInterface/commonSyncDataInterface";

// once on app load

export const EnergyLvlInteraction: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onRatingSelect = async (val: number) => {
    await saveEnergyLvl(val);
    props.onSuccess();
  };

  return (
    <div onmouseenter={props.onCancelCountdown}>
      <div class="txtBig" style="padding-bottom:32px;">
        How would you rate your energy level today?
      </div>
      <Rating onSetRating={onRatingSelect} anchors={["low", "high"]} />
    </div>
  );
};

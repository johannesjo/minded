/* @refresh reload */
import { createSignal, JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
import { saveEnergyLvl } from "@src/dataInterface/commonSyncDataInterface";
import { SaveBtn } from "@src/shared/components/ui/SaveBtn";

// once on app load

export const EnergyLvlInteraction: (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
}) => JSX.Element = (props) => {
  const onSave = async (val: number) => {
    await saveEnergyLvl(val);
    props.onSuccess();
  };

  const [getEnergyLvl, setEnergyLvl] = createSignal<number | null>(null);

  return (
    <div onmouseenter={props.onCancelCountdown}>
      <div class="txtBig" style="padding-bottom:32px;">
        How would you rate your energy level today?
      </div>
      <Rating onSetRating={setEnergyLvl} />

      <SaveBtn
        onSave={() => onSave(getEnergyLvl())}
        isVisible={!!getEnergyLvl()}
      />
    </div>
  );
};

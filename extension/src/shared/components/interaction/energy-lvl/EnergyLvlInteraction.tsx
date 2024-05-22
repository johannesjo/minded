/* @refresh reload */
import { createSignal, JSX } from "solid-js";
import Rating from "@src/shared/components/ui/Rating";
// @ts-ignore
import { saveEnergyLvl } from "@dataInterface/syncDataInterface";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";

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
    <div
      id="minded-6622-energy-lvl-interaction"
      onmouseenter={props.onCancelCountdown}
    >
      <div>How would you rate your energy level today?</div>
      <Rating onSetRating={setEnergyLvl} />

      <ButtonWrapper isVisible={!!getEnergyLvl()}>
        <div class="btn-big" onClick={() => onSave(getEnergyLvl())}>
          ➤ save
        </div>
      </ButtonWrapper>
    </div>
  );
};

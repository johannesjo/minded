import { createEffect, createSignal, JSX } from "solid-js";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";
import { Ico } from "@src/shared/components/ui/Ico";

export const SaveBtn = (props: {
  onSave: () => void;
  isVisible: boolean;
}): JSX.Element => {
  const [getIsVisible, setIsVisible] = createSignal<boolean>(props.isVisible);

  createEffect(() => {
    setIsVisible(props.isVisible);
  });

  return (
    <ButtonWrapper isVisible={getIsVisible()}>
      <div class="btnTxtBig" onClick={() => props.onSave()}>
        <Ico name="send" /> save
      </div>
    </ButtonWrapper>
  );
};

export default ButtonWrapper;

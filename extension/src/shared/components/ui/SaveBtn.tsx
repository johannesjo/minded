import { createEffect, createSignal, JSX } from "solid-js";
import ButtonWrapper from "@src/shared/components/ui/ButtonWrapper";

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
        ➤ save
      </div>
    </ButtonWrapper>
  );
};

export default ButtonWrapper;

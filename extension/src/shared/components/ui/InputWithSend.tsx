import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
// @ts-ignore
import { requestFocusAndShowKeyboard } from "@dataInterface/system";

export const InputWithSend = (props: {
  isAutoFocus?: boolean;
  value?: string;
  setRef?: (el: HTMLInputElement) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  maxLength?: number;
  isDisabled?: boolean;
  onSubmitClick: (val: string) => void;
}): JSX.Element => {
  let inpEl;
  let t0;
  let t1;

  const [getIsInputDisabled, setIsInputDisabled] = createSignal(
    props.isDisabled,
  );

  createEffect(() => {
    if (inpEl) {
      inpEl.value = props.value || "";
    }
  });

  createEffect(() => {
    setIsInputDisabled(props.isDisabled);
  });

  onMount(async () => {
    props.setRef?.(inpEl);

    if (props.isAutoFocus) {
      focusInp();
      t0 = setTimeout(() => focusInp(), 200);
      t1 = setTimeout(() => focusInp(), 600);
    }
  });

  onCleanup(() => {
    window.clearTimeout(t0);
    window.clearTimeout(t1);
  });

  const focusInp = () => {
    inpEl.focus();
    requestFocusAndShowKeyboard();
  };

  return (
    <div id="minded-6622-inp">
      <input
        ref={inpEl}
        type="text"
        disabled={getIsInputDisabled()}
        onkeydown={props.onKeyDown}
        maxlength={props.maxLength}
        autofocus={true}
      />
      <div
        onclick={() => {
          props.onSubmitClick(inpEl?.value);
        }}
      >
        <Ico name="send" />
      </div>
    </div>
  );
};

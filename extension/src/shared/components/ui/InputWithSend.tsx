import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
// @ts-ignore
import { requestFocusAndShowKeyboard } from "@dataInterface/system";

export const InputWithSend = (props: {
  type?: string;
  isAutoFocus?: boolean;
  value?: string;
  setRef?: (el: HTMLInputElement) => void;
  maxLength?: number;
  onSubmit: (val: string) => Promise<void>;
  onCancelCountdown?: () => void;
  onEscape: () => void;
}): JSX.Element => {
  let inpEl;
  let t0;
  let t1;

  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);

  createEffect(() => {
    if (inpEl) {
      inpEl.value = props.value || "";
    }
  });
  createEffect(() => {
    if (props.type === "url") {
      inpEl.value = "https://";
    }
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

  const onSubmit = async (val: string) => {
    if (!val) {
      focusInp();
      return;
    }

    setIsInputDisabled(true);
    await props.onSubmit(val);
    setIsInputDisabled(false);
  };

  const focusInp = () => {
    inpEl.focus();
    requestFocusAndShowKeyboard();
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === "Enter") {
      onSubmit((ev.target as HTMLInputElement).value);
    } else if (ev.key === "Escape") {
      props.onEscape();
    } else if (ev.key !== "Control") {
      props.onCancelCountdown?.();
    }
  };

  return (
    <div id="minded-6622-inp">
      <input
        spellcheck={false}
        ref={inpEl}
        type={props.type || "text"}
        disabled={getIsInputDisabled()}
        onkeydown={onKeyDown}
        maxlength={props.maxLength}
      />
      <div onclick={() => onSubmit(inpEl?.value)}>
        <Ico name="send" />
      </div>
    </div>
  );
};

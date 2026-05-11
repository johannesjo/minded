import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { requestFocusAndShowKeyboard } from "@src/dataInterface/system";

export const InputWithSend = (props: {
  type?: string;
  isAutoFocus?: boolean;
  value?: string;
  setRef?: (el: HTMLTextAreaElement) => void;
  maxLength?: number;
  onSubmit: (val: string) => Promise<void>;
  onInput?: (val: string) => void;
  onCancelCountdown?: () => void;
}): JSX.Element => {
  let inpEl: HTMLTextAreaElement;
  let t0: NodeJS.Timeout | undefined;
  let t1: NodeJS.Timeout | undefined;

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
    // Prevent keyboard events from reaching the host page (e.g., YouTube shortcuts)
    ev.stopPropagation();

    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      onSubmit((ev.target as HTMLTextAreaElement).value);
    } else if (ev.key === "Escape") {
      // Just blur the input instead of skipping - input stays visible
      inpEl.blur();
    } else if (ev.key !== "Control") {
      props.onCancelCountdown?.();
    }
  };

  return (
    <div id="minded-6622-inp" class="textarea-container">
      <textarea
        spellcheck={false}
        ref={inpEl!}
        disabled={getIsInputDisabled()}
        onkeydown={onKeyDown}
        maxlength={props.maxLength}
        rows={3}
        placeholder="Type your response..."
        onInput={(ev) => props.onInput?.(ev.currentTarget.value)}
      />
      <button
        type="button"
        class="send-button"
        aria-label="Submit response"
        onclick={() => onSubmit(inpEl?.value)}
        disabled={getIsInputDisabled()}
      >
        <Ico name="send" />
      </button>
    </div>
  );
};

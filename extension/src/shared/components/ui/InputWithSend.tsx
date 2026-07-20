import { createEffect, createSignal, JSX, onCleanup, onMount } from "solid-js";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { requestFocusAndShowKeyboard } from "@src/dataInterface/system";

export const InputWithSend = (props: {
  type?: string;
  isAutoFocus?: boolean;
  value?: string;
  setRef?: (el: HTMLTextAreaElement) => void;
  maxLength?: number;
  placeholder?: string;
  reflective?: boolean;
  autoGrow?: boolean;
  isSubmitReady?: (val: string) => boolean;
  "aria-labelledby"?: string;
  onSubmit: (val: string) => Promise<void>;
  onInput?: (val: string) => void;
  onCancelCountdown?: () => void;
}): JSX.Element => {
  let inpEl!: HTMLTextAreaElement;
  let t0: NodeJS.Timeout | undefined;
  let t1: NodeJS.Timeout | undefined;

  const [getIsInputDisabled, setIsInputDisabled] = createSignal(false);
  const [getCurrentValue, setCurrentValue] = createSignal("");

  const resizeToContent = () => {
    if (!props.autoGrow || !inpEl) return;
    inpEl.style.height = "auto";
    inpEl.style.height = `${inpEl.scrollHeight}px`;
    inpEl.style.overflowY =
      inpEl.scrollHeight > inpEl.offsetHeight ? "auto" : "hidden";
  };

  const getIsSubmitReady = () =>
    props.isSubmitReady?.(getCurrentValue()) ??
    getCurrentValue().trim().length > 0;

  const getShouldShowSubmit = () => !props.reflective || getIsSubmitReady();

  createEffect(() => {
    const value = props.value || "";
    setCurrentValue(value);
    if (inpEl) {
      inpEl.value = value;
      resizeToContent();
    }
  });
  createEffect(() => {
    if (props.type === "url") {
      inpEl.value = "https://";
      setCurrentValue(inpEl.value);
      resizeToContent();
    }
  });

  onMount(async () => {
    props.setRef?.(inpEl);
    resizeToContent();

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
    try {
      await props.onSubmit(val);
    } finally {
      // A rejecting onSubmit must never leave the input dead - the user's
      // text is still in the field and retrying has to stay possible.
      setIsInputDisabled(false);
    }
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
    <div
      id="minded-6622-inp"
      class="textarea-container"
      classList={{
        reflective: props.reflective,
        ["submit-ready"]: props.reflective && getIsSubmitReady(),
      }}
    >
      <textarea
        name={props.type === "url" ? "url" : "response"}
        aria-labelledby={props["aria-labelledby"]}
        spellcheck={false}
        ref={inpEl!}
        disabled={getIsInputDisabled()}
        onkeydown={onKeyDown}
        maxlength={props.maxLength}
        rows={3}
        placeholder={props.placeholder ?? "Type your response..."}
        onInput={(ev) => {
          setCurrentValue(ev.currentTarget.value);
          resizeToContent();
          props.onInput?.(ev.currentTarget.value);
        }}
      />
      <Btn
        variant="icon"
        class={`send-button${getIsSubmitReady() ? " is-ready" : ""}`}
        aria-label="Submit response"
        onClick={() => onSubmit(inpEl?.value)}
        disabled={getIsInputDisabled() || !getShouldShowSubmit()}
      >
        <Ico name="check" />
      </Btn>
    </div>
  );
};

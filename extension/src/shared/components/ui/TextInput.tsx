import { JSX } from "solid-js";
// @ts-ignore
import styles from "./TextInput.module.scss";

export interface TextInputProps {
  value: string;
  onInput?: (value: string) => void;
  onBlur?: (value: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: "text" | "time";
  class?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  /** Commit on Enter, for lists where blur alone would be a clumsy way to save. */
  onEnter?: (value: string) => void;
  /** The raw element, so a caller can focus a row it just added. */
  ref?: (el: HTMLInputElement) => void;
}

export const TextInput = (props: TextInputProps): JSX.Element => {
  return (
    <input
      type={props.type || "text"}
      ref={(el) => props.ref?.(el)}
      class={`${styles.TextInput} ${props.class || ""}`}
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      aria-label={props.ariaLabel}
      aria-invalid={props.ariaInvalid}
      aria-describedby={props.ariaDescribedBy}
      onKeyDown={(e) => {
        if (e.key === "Enter" && props.onEnter) {
          e.preventDefault();
          props.onEnter(e.currentTarget.value);
        }
      }}
      onInput={(e) => props.onInput?.(e.currentTarget.value)}
      onBlur={(e) => props.onBlur?.(e.currentTarget.value)}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  );
};

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
}

export const TextInput = (props: TextInputProps): JSX.Element => {
  return (
    <input
      type={props.type || "text"}
      class={`${styles.TextInput} ${props.class || ""}`}
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      onInput={(e) => props.onInput?.(e.currentTarget.value)}
      onBlur={(e) => props.onBlur?.(e.currentTarget.value)}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  );
};

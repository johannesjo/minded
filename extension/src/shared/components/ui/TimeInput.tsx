import { JSX } from "solid-js";
// @ts-ignore
import styles from "./TimeInput.module.scss";

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TimeInput = (props: TimeInputProps): JSX.Element => {
  return (
    <input
      type="time"
      class={styles.TimeInput}
      value={props.value}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.currentTarget.value)}
    />
  );
};

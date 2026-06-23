import { JSX } from "solid-js";
// @ts-ignore
import styles from "./TimeInput.module.scss";

export interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Accessible name — the field has no visible <label> association. */
  "aria-label"?: string;
}

export const TimeInput = (props: TimeInputProps): JSX.Element => {
  return (
    <input
      type="time"
      class={styles.TimeInput}
      value={props.value}
      disabled={props.disabled}
      aria-label={props["aria-label"]}
      onChange={(e) => props.onChange(e.currentTarget.value)}
    />
  );
};

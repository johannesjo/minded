import { JSX } from "solid-js";
// @ts-ignore
import styles from "./Checkbox.module.scss";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export const Checkbox = (props: CheckboxProps): JSX.Element => {
  return (
    <label
      class={`${styles.Checkbox} ${props.disabled ? styles.isDisabled : ""}`}
    >
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      <span class={styles.checkmark} />
      {props.label && <span class={styles.label}>{props.label}</span>}
    </label>
  );
};

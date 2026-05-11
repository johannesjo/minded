import { JSX } from "solid-js";
// @ts-ignore
import styles from "./Toggle.module.scss";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Toggle = (props: ToggleProps): JSX.Element => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.checked}
      disabled={props.disabled}
      class={`${styles.Toggle} ${props.disabled ? styles.isDisabled : ""}`}
      onClick={() => !props.disabled && props.onChange(!props.checked)}
    >
      {props.label && <span class={styles.label}>{props.label}</span>}
      <div
        class={`${styles.switch} ${props.checked ? styles.isChecked : ""}`}
      />
    </button>
  );
};

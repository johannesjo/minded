import { createEffect, JSX, onCleanup } from "solid-js";
// @ts-ignore
import styles from "./Toast.module.scss";

export interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export const Toast = (props: ToastProps): JSX.Element => {
  createEffect(() => {
    if (props.visible) {
      const timeout = setTimeout(() => {
        props.onHide();
      }, props.duration ?? 2000);

      onCleanup(() => clearTimeout(timeout));
    }
  });

  return (
    <div class={`${styles.Toast} ${props.visible ? styles.isVisible : ""}`}>
      {props.message}
    </div>
  );
};

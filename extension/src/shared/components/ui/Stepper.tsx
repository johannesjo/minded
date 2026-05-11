import { createEffect, createSignal, For, JSX } from "solid-js";
// @ts-ignore
import styles from "./Stepper.module.scss";

export const Stepper = (props: {
  nrOfSteps: number;
  activeStep: number;
  onSetStep?: (step: number) => void;
  isNoGoBack?: boolean;
  labelFn?: (step: number) => string | number | undefined;
}): JSX.Element => {
  const [getStep, setStep] = createSignal<number>(props.activeStep);
  const arr = Array.from({ length: props.nrOfSteps }, (_, i) => i);

  createEffect(() => {
    setStep(props.activeStep);
  });

  return (
    <div
      classList={{
        [styles.stepper]: true,
        [styles.isNoGoBack]: props.isNoGoBack,
      }}
    >
      <For each={arr}>
        {(step) => (
          <button
            type="button"
            disabled={props.isNoGoBack || step >= getStep()}
            onClick={() => {
              if (props.isNoGoBack) {
                return;
              }

              if (step < getStep()) {
                if (props.onSetStep) {
                  props.onSetStep(step);
                } else {
                  setStep(step);
                }
              }
            }}
            class={`${styles.step} ${step === getStep() ? styles.active : ""} ${step < getStep() ? styles.done : ""}`}
          >
            {props.labelFn && props.labelFn(step) !== undefined
              ? props.labelFn(step)
              : step < getStep()
                ? "✓"
                : step + 1}
          </button>
        )}
      </For>
    </div>
  );
};

export default Stepper;

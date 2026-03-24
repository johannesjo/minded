import { Component, onCleanup, onMount } from "solid-js";
import "./BudgetExhaustedMessage.scss";

interface BudgetExhaustedMessageProps {
  onComplete: () => void;
}

const DISPLAY_DURATION_MS = 2000;

export const BudgetExhaustedMessage: Component<BudgetExhaustedMessageProps> = (
  props,
) => {
  onMount(() => {
    const timeoutId = setTimeout(() => {
      props.onComplete();
    }, DISPLAY_DURATION_MS);

    onCleanup(() => clearTimeout(timeoutId));
  });

  return (
    <div class="budget-exhausted-wrapper">
      <div class="budget-exhausted-message">Daily budget used up</div>
    </div>
  );
};

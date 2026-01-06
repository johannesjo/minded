import { Component, onMount } from "solid-js";
import "./BudgetExhaustedMessage.scss";

interface BudgetExhaustedMessageProps {
  onComplete: () => void;
}

const DISPLAY_DURATION_MS = 2000;

export const BudgetExhaustedMessage: Component<BudgetExhaustedMessageProps> = (
  props,
) => {
  onMount(() => {
    setTimeout(() => {
      props.onComplete();
    }, DISPLAY_DURATION_MS);
  });

  return (
    <div class="budget-exhausted-wrapper">
      <div class="budget-exhausted-message">Daily budget used up</div>
    </div>
  );
};

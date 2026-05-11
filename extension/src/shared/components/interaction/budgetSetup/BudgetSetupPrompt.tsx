import { Component, For } from "solid-js";
import { DailyBudget } from "@src/dataInterface/syncData";
import "./BudgetSetupPrompt.scss";

interface BudgetSetupPromptProps {
  currentSkips: number;
  onSetBudget: (budget: DailyBudget) => void;
  onDismiss: () => void;
}

export const BudgetSetupPrompt: Component<BudgetSetupPromptProps> = (props) => {
  const budgetOptions = [
    { label: "15 min", value: 15 },
    { label: "30 min", value: 30 },
    { label: "45 min", value: 45 },
    { label: "1 hour", value: 60 },
  ];

  const handleSelectBudget = (minutes: number) => {
    props.onSetBudget({ globalMinutes: minutes });
  };

  return (
    <div class="budget-setup-wrapper">
      <div class="budget-setup-container">
        <div class="txtBig">Would you like to set a daily budget?</div>
        <div class="budget-setup-subtext">
          You've skipped {props.currentSkips} times today. Setting a budget
          gives you uninterrupted time.
        </div>

        <div class="budget-options-grid">
          <For each={budgetOptions}>
            {(option) => (
              <button
                type="button"
                class="btnToggleSelect"
                onClick={() => handleSelectBudget(option.value)}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="budget-setup-dismiss">
        <button type="button" class="btnTxt" onClick={props.onDismiss}>
          not now
        </button>
      </div>
    </div>
  );
};

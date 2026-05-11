import { Component, createSignal, For, onMount } from "solid-js";
import {
  getSyncData,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { DailyBudget } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import styles from "./BudgetSettings.module.scss";

interface BudgetSettingsProps {
  onAfterSave?: () => void;
}

const BUDGET_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

export const BudgetSettings: Component<BudgetSettingsProps> = (props) => {
  const [getBudget, setBudget] = createSignal<DailyBudget | null>(null);

  onMount(async () => {
    const syncData = await getSyncData();
    setBudget(syncData.dailyBudget);
  });

  const isEnabled = () => getBudget() !== null;

  const toggleEnabled = async () => {
    if (isEnabled()) {
      // Disable budget
      setBudget(null);
      await updateSyncData({ dailyBudget: null });
    } else {
      // Enable with default 30 min
      const newBudget: DailyBudget = { globalMinutes: 30 };
      setBudget(newBudget);
      await updateSyncData({ dailyBudget: newBudget });
    }
    props.onAfterSave?.();
  };

  const setMinutes = async (minutes: number) => {
    const newBudget: DailyBudget = {
      ...getBudget(),
      globalMinutes: minutes,
    };
    setBudget(newBudget);
    await updateSyncData({ dailyBudget: newBudget });
    props.onAfterSave?.();
  };

  return (
    <div class={styles.BudgetSettings}>
      <div class={styles.header}>
        <h3 class="h3" style={{ margin: 0 }}>
          Daily Budget
        </h3>
        <Toggle
          checked={isEnabled()}
          onChange={toggleEnabled}
          label={isEnabled() ? "On" : "Off"}
        />
      </div>

      <p class={styles.description}>
        {isEnabled()
          ? "Browse blocked sites freely within your daily budget. Interventions resume when time runs out."
          : "Set a daily time budget for uninterrupted browsing on blocked sites."}
      </p>

      {isEnabled() && (
        <div class={styles.options}>
          <div class={styles.optionsLabel}>Daily allowance:</div>
          <div class={styles.optionsGrid}>
            <For each={BUDGET_OPTIONS}>
              {(option) => (
                <button
                  type="button"
                  class={
                    getBudget()?.globalMinutes === option.value
                      ? "btnToggleSelect isSelected"
                      : "btnToggleSelect"
                  }
                  onClick={() => setMinutes(option.value)}
                >
                  {option.label}
                </button>
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  );
};

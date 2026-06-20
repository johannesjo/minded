import { createSignal, For, JSX, onMount } from "solid-js";
import {
  getSyncData,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { DailyBudget } from "@src/dataInterface/syncData";
import { Toggle } from "@src/shared/components/ui/Toggle";
import Btn from "@src/shared/components/ui/Btn";
import styles from "./BudgetSettings.module.scss";

const BUDGET_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

export const BudgetSettings = (): JSX.Element => {
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
  };

  const setMinutes = async (minutes: number) => {
    const newBudget: DailyBudget = {
      ...getBudget(),
      globalMinutes: minutes,
    };
    setBudget(newBudget);
    await updateSyncData({ dailyBudget: newBudget });
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
          ? "Allow yourself a daily allowance on blocked sites before interventions kick in. Turn this off to block immediately."
          : "Blocked sites are blocked immediately during Active Hours. Turn on for a daily allowance of uninterrupted browsing first."}
      </p>

      {isEnabled() && (
        <div class={styles.options}>
          <div class={styles.optionsLabel}>Daily allowance:</div>
          <div class={styles.optionsGrid}>
            <For each={BUDGET_OPTIONS}>
              {(option) => (
                <Btn
                  variant="toggle"
                  selected={getBudget()?.globalMinutes === option.value}
                  onClick={() => setMinutes(option.value)}
                >
                  {option.label}
                </Btn>
              )}
            </For>
          </div>
        </div>
      )}
    </div>
  );
};

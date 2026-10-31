import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { updateBlockedApps } from "@src/dataInterface/commonSyncDataInterface";
import { Checkbox } from "@src/shared/components/ui/Checkbox";
import Btn from "@src/shared/components/ui/Btn";
import { companionWord } from "@src/shared/addWrapperClasses";
import { readInstalledApps, type InstalledApp } from "./installedApps";
import pickerStyles from "./SettingsAndroid.module.scss";
import styles from "./ChosenAppsSettings.module.scss";

/**
 * The settings page's apps section: only the apps already chosen, plus a way
 * into the full picker (/settings/apps). A phone lists 60-150 apps; inlining
 * all of them buried every other setting under one long scroll.
 *
 * Unticking an app saves at once but keeps its row (unchecked) until the page
 * is left, so the choice doesn't pop out from under the user's finger.
 */
export const ChosenAppsSettings = (props: { initialBlockedApps: string[] }) => {
  let t0: ReturnType<typeof setTimeout> | undefined;
  const [getChosen, setChosen] = createSignal(props.initialBlockedApps);
  // Rows wait for the native labels rather than flashing package names.
  const [getRows, setRows] = createSignal<InstalledApp[]>();

  onMount(() => {
    if (!props.initialBlockedApps.length) {
      setRows([]);
      return;
    }
    t0 = setTimeout(() => {
      // Chosen apps since uninstalled have no label and no row; they stay in
      // the stored choice, harmlessly, as before.
      setRows(
        readInstalledApps().filter((a) =>
          props.initialBlockedApps.includes(a.packageName),
        ),
      );
    });
  });

  onCleanup(() => clearTimeout(t0));

  const handleToggle = async (packageName: string) => {
    const next = getChosen().includes(packageName)
      ? getChosen().filter((p) => p !== packageName)
      : [...getChosen(), packageName];
    setChosen(next);
    await updateBlockedApps(next);
  };

  return (
    <div class={styles.ChosenAppsSettings}>
      <h3 class="h3">Apps</h3>
      <p class={styles.description}>Where the {companionWord()} meets you.</p>

      <Show when={getRows()?.length}>
        <div class={pickerStyles.appList}>
          <For each={getRows()}>
            {(app) => (
              <div
                class={pickerStyles.appEntry}
                onClick={() => handleToggle(app.packageName)}
              >
                <div class={pickerStyles.checkboxDisplay}>
                  <Checkbox
                    checked={getChosen().includes(app.packageName)}
                    onChange={() => {}}
                  />
                </div>
                <span class={pickerStyles.appName}>{app.name}</span>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Btn outline href="/settings/apps">
        Choose apps
      </Btn>
    </div>
  );
};

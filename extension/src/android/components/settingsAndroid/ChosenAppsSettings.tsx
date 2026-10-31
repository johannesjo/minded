import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { updateBlockedApps } from "@src/dataInterface/commonSyncDataInterface";
import Btn from "@src/shared/components/ui/Btn";
import { companionWord } from "@src/shared/addWrapperClasses";
import { peekInstalledApps, readInstalledApps } from "./installedApps";
import { AppRow } from "./AppRow";
import pickerStyles from "./SettingsAndroid.module.scss";
import styles from "./ChosenAppsSettings.module.scss";

type Row = { packageName: string; name: string };

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
  // eslint-disable-next-line solid/reactivity -- read once: the rows are fixed for this visit
  const chosenAtOpen = props.initialBlockedApps;
  const [getChosen, setChosen] = createSignal(chosenAtOpen);

  const toRows = (apps: Row[]): Row[] =>
    apps.filter((a) => chosenAtOpen.includes(a.packageName));
  // Until the native labels are read, one unlabelled row per chosen app holds
  // the space, so the section doesn't grow (and push the page down) later.
  // Chosen apps since uninstalled have no label and drop out then; they stay in
  // the stored choice, harmlessly, as before.
  const cached = peekInstalledApps();
  const [getRows, setRows] = createSignal<Row[]>(
    cached
      ? toRows(cached)
      : chosenAtOpen.map((packageName) => ({ packageName, name: "" })),
  );

  onMount(() => {
    if (cached || !chosenAtOpen.length) return;
    t0 = setTimeout(() => setRows(toRows(readInstalledApps())));
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

      <Show when={getRows().length}>
        <div class={`${pickerStyles.appList} ${styles.list}`}>
          <For each={getRows()}>
            {(app) => (
              <AppRow
                name={app.name || "\u00a0"}
                checked={getChosen().includes(app.packageName)}
                onToggle={() => handleToggle(app.packageName)}
              />
            )}
          </For>
        </div>
      </Show>

      <div class={styles.actions}>
        <Btn outline href="/settings/apps">
          Choose apps
        </Btn>
      </div>
    </div>
  );
};

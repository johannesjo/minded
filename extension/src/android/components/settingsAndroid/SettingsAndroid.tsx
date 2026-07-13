// SettingsAndroid.tsx
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import styles from "./SettingsAndroid.module.scss";
import {
  getSyncData,
  updateBlockedApps,
} from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { safeJsonParse } from "@src/util/safeJsonParse";
import { useNavigate } from "@solidjs/router";
import { Ico } from "@src/shared/components/ui/Ico";
import { Checkbox } from "@src/shared/components/ui/Checkbox";
import Btn from "@src/shared/components/ui/Btn";
import { companionWord } from "@src/shared/addWrapperClasses";
import {
  createWidgetPlacement,
  isWidgetPinAvailable,
  readIsWidgetPlaced,
} from "@src/android/util/widgetPlacement";

export const SettingsAndroid = (props: {
  isRouting?: boolean;
  saveBtnTxt?: string;
  /** Heading above the app list. Onboarding overrides it with presence framing. */
  heading?: string;
  /**
   * Called on save with the apps chosen. Onboarding routes on it: apps →
   * the permission steps those apps need; none (the home-screen place alone)
   * → straight to "ready", skipping the permission asks entirely.
   */
  onSave?: (selectedApps: string[]) => void;
  /**
   * When true, each app toggle persists immediately and the save/back
   * buttons are hidden. Used by the settings screen. Onboarding leaves
   * this off so the bottom button can act as "save & continue".
   */
  autoSave?: boolean;
}) => {
  let t0: NodeJS.Timeout | undefined;
  const [getAvailableApps, setAvailableApps] = createSignal<
    { packageName: string; name: string }[]
  >([]);

  const navigate = props.isRouting ? useNavigate() : () => undefined;
  const [getSelectedApps, setSelectedApps] = createSignal<string[]>([]);

  // "Your home screen" is one more PLACE the sun can meet you - a peer of the
  // apps below, under the same heading. It is select-by-doing: the row fires
  // the system pin dialog (a checkbox can't place a widget), and its checked
  // state is the OBSERVED launcher state, never an intent flag. A widget
  // already placed when this view opens retires the row (nothing to offer);
  // one placed just now stays visible, checked, so the choice doesn't pop out
  // from under the user.
  const widgetPlacement = createWidgetPlacement();
  const wasWidgetPlacedAtMount = readIsWidgetPlaced();
  const [getIsShowManualPinHint, setIsShowManualPinHint] = createSignal(false);
  // Only in the onboarding / re-entry picker (which frames the list as "places
  // the sun can meet you"), never in the standalone "manage blocked apps"
  // settings screen (autoSave), whose heading is about apps, not places.
  const isShowWidgetRow = () =>
    !props.autoSave && isWidgetPinAvailable() && !wasWidgetPlacedAtMount;

  const handleWidgetRowClick = () => {
    if (widgetPlacement.getIsPlaced()) return;
    if (!widgetPlacement.requestPin()) setIsShowManualPinHint(true);
  };

  onMount(() => {
    t0 = setTimeout(() => {
      const apps = safeJsonParse<{ packageName: string; name: string }[]>(
        androidInterface.getAllApps(),
        [],
      );
      setAvailableApps(apps);
    });

    getSyncData().then((syncData) => {
      setSelectedApps(syncData.cfg.blockedApps || []);
    });
  });

  onCleanup(() => {
    window.clearTimeout(t0);
  });

  const handleToggleApp = async (packageName: string) => {
    const isSelected = getSelectedApps().includes(packageName);
    const newSelected = isSelected
      ? getSelectedApps().filter((a) => a !== packageName)
      : [...getSelectedApps(), packageName];
    setSelectedApps(newSelected);
    if (props.autoSave) {
      await updateBlockedApps(newSelected);
    }
  };

  const handleSave = async () => {
    await updateBlockedApps(getSelectedApps());
    // Only navigates when used as a standalone route (isRouting); in onboarding
    // `navigate` is a no-op and `onSave` drives the step change. The router-level
    // page-fade interceptor (RouteCmp) eases this home rather than hard-cutting,
    // matching the sibling SettingsAndroidRoute.
    navigate("/");
    props.onSave?.(getSelectedApps());
  };

  // At least one place - an app, or the (really) placed widget - makes the
  // choice complete. Apps alone used to be the only gate; the home-screen
  // place is a peer, so it satisfies it too.
  const hasChosenAPlace = () =>
    !!getSelectedApps()?.length || widgetPlacement.getIsPlaced();

  return (
    <div class="pageTransitionIn">
      <div class={`txtBig ${styles.inset}`}>
        {props.heading || "Choose the apps where the sun should meet you."}
      </div>

      {/* The widget row is a costless, permission-free place - it must stay
          reachable even if the app enumeration is slow or fails (returns []),
          so it lives above the loading gate, not inside it. */}
      <div class={styles.appList}>
        <Show when={isShowWidgetRow()}>
          <div
            class={styles.appEntry}
            classList={{
              [styles.appEntryDone]: widgetPlacement.getIsPlaced(),
            }}
            onClick={handleWidgetRowClick}
          >
            <div class={styles.checkboxDisplay}>
              <Checkbox
                checked={widgetPlacement.getIsPlaced()}
                onChange={() => {}}
              />
            </div>
            <span class={styles.appName}>
              Your home screen
              <span class={styles.appEntrySub}>
                {widgetPlacement.getIsPlaced()
                  ? `the ${companionWord()} rests there as a widget`
                  : `the ${companionWord()} as a widget - no permissions needed`}
              </span>
            </span>
          </div>
          <Show when={getIsShowManualPinHint()}>
            <p class={styles.manualPinHint}>
              Your launcher doesn't support adding it from here: long-press your
              home screen → Widgets → <em>minded</em>.
            </p>
          </Show>
        </Show>
        {getAvailableApps().length === 0 ? (
          <div class={styles.inset}>Loading apps...</div>
        ) : (
          <For each={getAvailableApps()}>
            {(app) => (
              <div
                class={styles.appEntry}
                onClick={() => handleToggleApp(app.packageName)}
              >
                <div class={styles.checkboxDisplay}>
                  <Checkbox
                    checked={getSelectedApps().includes(app.packageName)}
                    onChange={() => {}}
                  />
                </div>
                <span class={styles.appName}>{app.name}</span>
              </div>
            )}
          </For>
        )}
      </div>

      {!props.autoSave && (
        <div>
          {props.isRouting && (
            <Btn class={styles.backBtn} onClick={() => navigate("/")}>
              <Ico name="arrowBack" /> Back
            </Btn>
          )}

          <Btn disabled={!hasChosenAPlace()} onClick={handleSave}>
            <Ico name="send" /> {props.saveBtnTxt || "Save"}
          </Btn>
        </div>
      )}
    </div>
  );
};

// SettingsAndroid.tsx
import { createSignal, For, onCleanup, onMount } from "solid-js";
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
import { navigateWithPageFadeOut } from "@src/util/animation";

export const SettingsAndroid = (props: {
  isRouting?: boolean;
  saveBtnTxt?: string;
  /** Heading above the app list. Onboarding overrides it with presence framing. */
  heading?: string;
  onSave?: () => void;
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
    // `navigate` is a no-op and `onSave` drives the step change. Fade out first
    // so the routed case eases home rather than hard-cutting, matching the
    // sibling SettingsAndroidRoute.
    navigateWithPageFadeOut(navigate, "/");
    props.onSave?.();
  };

  return (
    <div class="pageTransitionIn">
      <div class={`txtBig ${styles.inset}`}>
        {props.heading ||
          "Please select at least one app that you want to use less."}
      </div>

      {getAvailableApps().length === 0 ? (
        <div class={styles.inset}>Loading apps...</div>
      ) : (
        <>
          <div class={styles.appList}>
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
          </div>

          {!props.autoSave && (
            <div>
              {props.isRouting && (
                <Btn
                  class={styles.backBtn}
                  onClick={() => navigateWithPageFadeOut(navigate, "/")}
                >
                  <Ico name="arrowBack" /> Back
                </Btn>
              )}

              <Btn disabled={!getSelectedApps()?.length} onClick={handleSave}>
                <Ico name="send" /> {props.saveBtnTxt || "Save"}
              </Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
};

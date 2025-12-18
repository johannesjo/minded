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

export const SettingsAndroid = (props: {
  isRouting?: boolean;
  saveBtnTxt?: string;
  onSave?: () => void;
  showButtons?: boolean;
  onChange?: (apps: string[]) => void;
}) => {
  let t0: NodeJS.Timeout | undefined;
  // const navigate = useNavigate();
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

  const handleToggleApp = (packageName: string) => {
    const isSelected = getSelectedApps().includes(packageName);
    const newSelected = isSelected
      ? getSelectedApps().filter((a) => a !== packageName)
      : [...getSelectedApps(), packageName];
    setSelectedApps(newSelected);
    props.onChange?.(newSelected);
  };

  const handleSave = () => {
    updateBlockedApps(getSelectedApps());
    navigate("/");
    props.onSave?.();
  };

  return (
    <div class="pageTransitionIn">
      <div class="txtBig" style="margin: 16px;">
        Please select at least one app that you want to use less.
      </div>

      {getAvailableApps().length === 0 ? (
        <div style="margin: 16px;">Loading apps...</div>
      ) : (
        <>
          <div class={styles.appList}>
            <For each={getAvailableApps()}>
              {(app) => (
                <div
                  class={styles.appEntry}
                  onClick={() => handleToggleApp(app.packageName)}
                >
                  <div style="pointer-events: none;">
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

          {props.showButtons !== false && (
            <div>
              {props.isRouting && (
                <button
                  class="btnTxt"
                  style="margin-right: 16px;"
                  onClick={() => navigate("/")}
                >
                  <Ico name="arrowBack" /> Back
                </button>
              )}

              <button
                class="btnTxt"
                disabled={!getSelectedApps()?.length}
                onClick={handleSave}
              >
                <Ico name="send" /> {props.saveBtnTxt || "Save"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

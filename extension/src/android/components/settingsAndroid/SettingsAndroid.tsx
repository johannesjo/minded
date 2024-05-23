// SettingsAndroid.tsx
import { createSignal, For, onMount } from "solid-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "./SettingsAndroid.module.scss";
import {
  getSyncData,
  updateBlockedApps,
} from "@src/dataInterface/android/syncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { useNavigate } from "@solidjs/router";

export const SettingsAndroid = (props: {
  isRouting?: boolean;
  onSave?: () => void;
}) => {
  // const navigate = useNavigate();
  const [getAvailableApps, setAvailableApps] = createSignal<
    { packageName: string; name: string }[]
  >([]);

  const navigate = props.isRouting ? useNavigate() : () => undefined;
  const [getSelectedApps, setSelectedApps] = createSignal<string[]>([]);

  onMount(() => {
    setAvailableApps(JSON.parse(androidInterface.getAllApps()));
    getSyncData().then((syncData) => {
      setSelectedApps(syncData.cfg.blockedApps || []);
    });
  });

  const handleSelect = (app: { packageName: string; name: string }) => {
    if (getSelectedApps().includes(app.packageName)) {
      setSelectedApps(getSelectedApps().filter((a) => a !== app.packageName));
    } else {
      setSelectedApps([...getSelectedApps(), app.packageName]);
    }
  };

  const handleSave = () => {
    updateBlockedApps(getSelectedApps());
    navigate("/");
    props.onSave?.();
  };

  return (
    <div>
      <div class="txtBig" style="margin: 16px;">
        Please select at least one app that you want to use less.
      </div>

      <div class={styles.appList}>
        <For each={getAvailableApps()}>
          {(app) => (
            <div
              onClick={() => handleSelect(app)}
              class={`${styles.appEntry} ${getSelectedApps().includes(app.packageName) ? styles.selected : ""}`}
            >
              {getSelectedApps().includes(app.packageName) && <span>✓ </span>}
              {app.name}
            </div>
          )}
        </For>
      </div>

      <div>
        {props.isRouting && (
          <button
            class="btnTxtBig"
            style="margin-right: 16px;"
            onClick={() => navigate("/")}
          >
            Back
          </button>
        )}

        <button
          class="btnTxtBig"
          disabled={!getSelectedApps()?.length}
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

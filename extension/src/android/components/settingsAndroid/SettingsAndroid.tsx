// SettingsAndroid.tsx
import { createSignal, For, onCleanup, onMount } from "solid-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import styles from "./SettingsAndroid.module.scss";
import {
  getSyncData,
  updateBlockedApps,
} from "@src/dataInterface/commonSyncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { useNavigate } from "@solidjs/router";
import { Ico } from "@src/shared/components/ui/Ico";

export const SettingsAndroid = (props: {
  isRouting?: boolean;
  saveBtnTxt?: string;
  onSave?: () => void;
}) => {
  let t0;
  // const navigate = useNavigate();
  const [getAvailableApps, setAvailableApps] = createSignal<
    { packageName: string; name: string }[]
  >([]);

  const navigate = props.isRouting ? useNavigate() : () => undefined;
  const [getSelectedApps, setSelectedApps] = createSignal<string[]>([]);

  onMount(() => {
    t0 = setTimeout(() => {
      setAvailableApps(JSON.parse(androidInterface.getAllApps()));
    });

    getSyncData().then((syncData) => {
      setSelectedApps(syncData.cfg.blockedApps || []);
    });
  });

  onCleanup(() => {
    window.clearTimeout(t0);
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
    <div class="pageTransitionIn">
      <div class="txtBig" style="margin: 16px;">
        Please select at least one app that you want to use less.
      </div>

      {getAvailableApps().length === 0 && (
        <div style="margin: 16px;">Loading apps...</div>
      )}

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
            <Ico name="arrowBack" /> Back
          </button>
        )}

        <button
          class="btnTxtBig"
          disabled={!getSelectedApps()?.length}
          onClick={handleSave}
        >
          <Ico name="send" /> {props.saveBtnTxt || "Save"}
        </button>
      </div>
    </div>
  );
};

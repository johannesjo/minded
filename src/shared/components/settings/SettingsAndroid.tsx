// SettingsAndroid.tsx
import { createSignal, onMount } from "solid-js";
// @ts-ignore
import styles from "./SettingsAndroid.module.scss";
import {
  getSyncData,
  updateBlockedApps,
} from "@src/dataInterface/android/syncDataInterface";
import { androidInterface } from "@src/dataInterface/android/androidInterface";
import { useNavigate } from "@solidjs/router"; // Import the styles

interface SettingsAndroidProps {
  // Define any props that you need for this component
}

export const SettingsAndroid = (props: SettingsAndroidProps) => {
  // const [getAvailableApps, setAvailableApps] = createSignal<
  //   { packageName: string; name: string }[]
  // >([
  //   {
  //     packageName: "asd",
  //     name: "Some app",
  //   },
  //   {
  //     packageName: "Soooome ",
  //     name: "Some app other hhi",
  //   },
  // ]);

  const navigate = useNavigate();
  const [getAvailableApps, setAvailableApps] = createSignal<
    { packageName: string; name: string }[]
  >(JSON.parse(androidInterface.getAllApps()));

  const [getSelectedApps, setSelectedApps] = createSignal<string[]>([]);

  onMount(() => {
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
    console.log(getSelectedApps());
    updateBlockedApps(getSelectedApps());
    navigate("/");
  };

  return (
    <div>
      <div class="minded-6622-txt-big" style="margin: 16px;">
        Please select at least one app that you want to use less.
      </div>

      <div class={styles.appList}>
        {getAvailableApps().map((app) => (
          <div
            // @ts-ignore
            key={app.packageName}
            onClick={() => handleSelect(app)}
            class={`${styles.appEntry} ${getSelectedApps().includes(app.packageName) ? styles.selected : ""}`}
          >
            {getSelectedApps().includes(app.packageName) && <span>✓ </span>}
            {app.name}
          </div>
        ))}
      </div>

      <div style="display: flXex;">
        <button
          class="btn-big"
          style="margint-right: 16px;"
          onClick={() => navigate("/")}
        >
          Back
        </button>

        <button
          class="btn-big"
          disabled={!getSelectedApps()?.length}
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

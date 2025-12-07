import { createSignal, JSX, onMount } from "solid-js";
import {
  getSyncData,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import { Toggle } from "@src/shared/components/ui/Toggle";

export const SoundSettings = (props: {
  onAfterSave: () => void;
}): JSX.Element => {
  const [soundEnabled, setSoundEnabled] = createSignal(true);

  onMount(() => {
    getSyncData().then((syncData) => {
      setSoundEnabled(syncData.cfg.soundEnabled ?? true);
    });
  });

  const toggleSound = async () => {
    const newValue = !soundEnabled();
    setSoundEnabled(newValue);
    await updateUserCfg({ soundEnabled: newValue });
    props.onAfterSave();
  };

  return (
    <div style={{ "padding-bottom": "8px", "text-align": "center" }}>
      <div
        style={{ display: "inline-flex", "align-items": "center", gap: "16px" }}
      >
        <h3 class="h3" style={{ margin: 0 }}>
          Completion Sound
        </h3>
        <Toggle
          checked={soundEnabled()}
          onChange={toggleSound}
          label={soundEnabled() ? "On" : "Off"}
        />
      </div>
    </div>
  );
};

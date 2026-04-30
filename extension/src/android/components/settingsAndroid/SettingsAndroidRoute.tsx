import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { SettingsAndroid } from "./SettingsAndroid";
import { BudgetSettings } from "@src/shared/components/settings/BudgetSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SleepWindDownSettings } from "@src/shared/components/settings/SleepWindDownSettings";
import { Toast } from "@src/shared/components/ui/Toast";
import { Ico } from "@src/shared/components/ui/Ico";
import {
  updateBlockedApps,
  updateUserCfg,
} from "@src/dataInterface/commonSyncDataInterface";
import {
  FocusSchedule as FocusScheduleType,
  SleepWindDownCfg,
} from "@src/dataInterface/syncData";
import {
  cancelSleepWindDownAlarms,
  refreshSleepWindDownAlarms,
} from "@src/shared/components/sleepWindDown/androidBridge";

export const SettingsAndroidRoute = () => {
  const navigate = useNavigate();
  const [showToast, setShowToast] = createSignal(false);

  // Track pending changes
  const [pendingApps, setPendingApps] = createSignal<string[] | null>(null);
  const [pendingSound, setPendingSound] = createSignal<boolean | null>(null);
  const [pendingSchedule, setPendingSchedule] =
    createSignal<FocusScheduleType | null>(null);
  const [pendingSleepWindDown, setPendingSleepWindDown] =
    createSignal<SleepWindDownCfg | null>(null);

  const handleSaveAll = async () => {
    if (pendingApps() !== null) {
      await updateBlockedApps(pendingApps()!);
    }
    if (pendingSound() !== null) {
      await updateUserCfg({ soundEnabled: pendingSound()! });
    }
    if (pendingSchedule() !== null) {
      await updateUserCfg({ focusSchedule: pendingSchedule()! });
    }
    if (pendingSleepWindDown() !== null) {
      const next = pendingSleepWindDown()!;
      await updateUserCfg({ sleepWindDown: next });
      // Reschedule the alarm to match the new cfg, or cancel if disabled.
      if (next.enabled) {
        refreshSleepWindDownAlarms();
      } else {
        cancelSleepWindDownAlarms();
      }
    }
    setShowToast(true);
  };

  return (
    <div class="pageTransitionIn">
      <h2 class="h2">minded – Settings</h2>

      <SettingsAndroid
        showButtons={false}
        onChange={(apps) => setPendingApps(apps)}
      />

      <hr style={{ opacity: "0.2", margin: "32px 16px" }} />

      <SoundSettings
        autoSave={false}
        onChange={(enabled) => setPendingSound(enabled)}
      />

      <hr style={{ opacity: "0.2", margin: "32px 16px" }} />

      <BudgetSettings />

      <hr style={{ opacity: "0.2", margin: "32px 16px" }} />

      <FocusSchedule
        showSaveButton={false}
        onChange={(schedule) => setPendingSchedule(schedule)}
      />

      <hr style={{ opacity: "0.2", margin: "32px 16px" }} />

      <SleepWindDownSettings onChange={(cfg) => setPendingSleepWindDown(cfg)} />

      <div style={{ "text-align": "center", margin: "32px 16px" }}>
        <button
          class="btnTxt"
          style={{ "margin-right": "16px" }}
          onClick={() => navigate("/")}
        >
          <Ico name="arrowBack" /> Back
        </button>
        <button class="btnTxt" onClick={handleSaveAll}>
          <Ico name="send" /> Save
        </button>
      </div>

      <Toast
        message="Settings saved"
        visible={showToast()}
        onHide={() => setShowToast(false)}
      />
    </div>
  );
};

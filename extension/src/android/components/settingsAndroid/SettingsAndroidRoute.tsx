import { createSignal } from "solid-js";
import { SettingsAndroid } from "./SettingsAndroid";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { Toast } from "@src/shared/components/ui/Toast";

export const SettingsAndroidRoute = () => {
  const [showToast, setShowToast] = createSignal(false);

  const onAfterSave = () => {
    setShowToast(true);
  };

  return (
    <div class="pageTransitionIn">
      <h2 class="h2">minded – Settings</h2>

      <SettingsAndroid isRouting={true} saveBtnTxt="save" onSave={() => {}} />

      <hr style="opacity: 0.2; margin: 32px 16px;" />

      <SoundSettings onAfterSave={onAfterSave} />

      <hr style="opacity: 0.2; margin: 32px 16px;" />

      <FocusSchedule onAfterSave={onAfterSave} />

      <Toast
        message="Settings saved"
        visible={showToast()}
        onHide={() => setShowToast(false)}
      />
    </div>
  );
};

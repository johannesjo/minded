import { useNavigate } from "@solidjs/router";
import { SettingsAndroid } from "./SettingsAndroid";
import { SessionGraceSettings } from "@src/shared/components/settings/SessionGraceSettings";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SleepWindDownSettings } from "@src/shared/components/settings/SleepWindDownSettings";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { navigateWithPageFadeOut } from "@src/util/animation";

export const SettingsAndroidRoute = () => {
  const navigate = useNavigate();

  return (
    <div class="pageTransitionIn">
      <h2 class="h2">minded – Settings</h2>

      <SettingsAndroid autoSave={true} />

      <hr style="opacity: 0.2; margin: 32px 16px;" />

      <SoundSettings />

      <hr style="opacity: 0.2; margin: 32px 16px;" />

      <SessionGraceSettings />

      <hr style="opacity: 0.2; margin: 32px 16px;" />

      <FocusSchedule />

      <hr style="opacity: 0.2; margin: 32px 16px;" />

      <SleepWindDownSettings autoSave={true} />

      <div style="text-align: center; margin: 32px 16px;">
        <Btn onClick={() => navigateWithPageFadeOut(navigate, "/")}>
          <Ico name="arrowBack" /> Back
        </Btn>
      </div>
    </div>
  );
};

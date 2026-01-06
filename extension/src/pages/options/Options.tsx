import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
import { BudgetSettings } from "@src/shared/components/settings/BudgetSettings";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";
import { SoundSettings } from "@src/shared/components/settings/SoundSettings";

const Options = () => {
  const onAfterSave = () => {
    // Settings auto-save, no alert needed
  };

  return (
    <div class="pageTransitionIn">
      <h2 class="h2">minded – Settings</h2>

      <br />
      <h3 class="h3">
        list of websites where <em>minded</em> is shown
      </h3>
      <WebsiteList onAfterSave={onAfterSave} />

      <br />
      <hr style="opacity: 0.2; margin: 32px 0;" />
      <br />

      <SoundSettings onAfterSave={onAfterSave} />

      <br />
      <hr style="opacity: 0.2; margin: 32px 0;" />
      <br />

      <BudgetSettings onAfterSave={onAfterSave} />

      <br />
      <hr style="opacity: 0.2; margin: 32px 0;" />
      <br />

      <FocusSchedule onAfterSave={onAfterSave} />
    </div>
  );
};

export default Options;

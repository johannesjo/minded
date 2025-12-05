import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";
import { FocusSchedule } from "@src/shared/components/settings/FocusSchedule";

const Options = () => {
  const onAfterSave = () => {
    alert("The settings have been saved!");
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

      <FocusSchedule onAfterSave={onAfterSave} />
    </div>
  );
};

export default Options;

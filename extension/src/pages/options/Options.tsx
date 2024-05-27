import { WebsiteList } from "@pages/newtab/components/onboardingWeb/WebsiteList";

const Options = () => {
  const onAfterSave = () => {
    alert("The settings have been saved!");
    window?.history?.back();
  };

  return (
    <div class="pageTransitionIn">
      <h2 class="h2">minded – Settings</h2>
      <br />
      <h3 class="h3">
        list of websites where <em>minded</em> is shown
      </h3>
      <WebsiteList onAfterSave={onAfterSave}></WebsiteList>
    </div>
  );
};

export default Options;

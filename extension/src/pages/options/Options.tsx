import { WebsiteList } from "@src/shared/components/onboardingWeb/WebsiteList";

const Options = () => {
  const onAfterSave = () => {
    alert("The settings have been saved!");
    window?.history?.back();
  };

  return (
    <div class="pageTransitionIn">
      <h2>minded – Settings</h2>
      <br />
      <h3>list of websites to handle</h3>
      <WebsiteList onAfterSave={onAfterSave}></WebsiteList>
    </div>
  );
};

export default Options;

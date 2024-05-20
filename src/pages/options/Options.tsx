import { WebsiteList } from "@src/shared/components/onboardingWeb/WebsiteList";
import { onMount } from "solid-js";
import { addDayTimeDependentClass } from "@src/shared/addDayTimeDependentClass";

const Options = () => {
  const onAfterSave = () => {
    alert("The settings have been saved!");
  };
  onMount(() => {
    addDayTimeDependentClass();
  });

  return (
    <div id="minded-6622-coloured-wrapper">
      <h2>minded – Settings</h2>
      <br />
      <h3>list of websites to handle</h3>
      <WebsiteList onAfterSave={onAfterSave}></WebsiteList>
    </div>
  );
};

export default Options;

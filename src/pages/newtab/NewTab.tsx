import { Dashboard } from "@src/shared/components/Dashboard";
import { createSignal, onMount } from "solid-js";
import { Question } from "@src/shared/components/Question";
import { getSyncData } from "@src/shared/data/dataInterface";
import { Onboarding } from "@src/shared/components/Onboarding";

const NewTab = () => {
  const [getIsShowQuestion, setIsShowQuestion] = createSignal(false);
  const [getIsShowOnboarding, setIsShowOnboarding] = createSignal(false);

  onMount(() => {
    getSyncData().then((syncData) => {
      console.log(syncData);

      if (!syncData.answers.length) {
        if (syncData.isOnboardingComplete) {
          setIsShowQuestion(true);
        } else {
          setIsShowOnboarding(true);
          console.log("SHOW ONBOARDING");
        }
      }
    });
  });

  return (
    <>
      {getIsShowOnboarding() ? (
        <Onboarding />
      ) : getIsShowQuestion() ? (
        <Question
          isUnskippable={true}
          onHide={() => setIsShowQuestion(false)}
        />
      ) : (
        <Dashboard />
      )}
    </>
  );
};

export default NewTab;

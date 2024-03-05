import { Dashboard } from "@src/shared/components/Dashboard";
import { createSignal, onMount } from "solid-js";
import { Question } from "@src/shared/components/Question";
import { getSyncData } from "@src/shared/data/dataInterface";

const NewTab = () => {
  const [getIsShowQuestion, setIsShowQuestion] = createSignal(false);
  const [getIsOnboardingComplete, setIsOnboardingComplete] = createSignal(true);

  onMount(() => {
    getSyncData().then((syncData) => {
      if(!syncData.answers.length) {
        setIsShowQuestion(true);
      }
    });
  });

  if(!getIsOnboardingComplete()) {
    // TODO add onboarding
    return <Dashboard />;
  }

  return (
    <>
      {getIsShowQuestion() ? (
        <Question
          isSkipAutoHide={true}
          onHide={() => setIsShowQuestion(false)}
        />
      ) : (
        <Dashboard />
      )}
    </>
  );
};

export default NewTab;

import { MindedDashboard } from "@src/shared/components/MindedDashboard";
import { createSignal, onMount } from "solid-js";
import { MindedQuestion } from "@src/shared/components/MindedQuestion";
import { getSyncData } from "@src/shared/data/dataInterface";

const NewTab = () => {
  const [getIsShowQuestion, setIsShowQuestion] = createSignal(false);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (!syncData.answers.length) {
        setIsShowQuestion(true);
      }
    });
  });

  return (
    <>
      {getIsShowQuestion() ? (
        <MindedQuestion
          isSkipAutoHide={true}
          onHide={() => setIsShowQuestion(false)}
        />
      ) : (
        <MindedDashboard />
      )}
    </>
  );
};

export default NewTab;

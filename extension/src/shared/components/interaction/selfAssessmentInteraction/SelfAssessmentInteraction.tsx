import { createSignal, JSX, onMount } from "solid-js";
import {
  SELF_ASSESSMENT_ANSWERS,
  SELF_ASSESSMENT_QUESTIONS,
  SelfReflectionAnswerVal,
} from "./selfAssessment.model";
import TglBtns from "@src/shared/components/ui/TglBtns";
import { saveSelfAssessment } from "@src/dataInterface/commonSyncDataInterface";
import { SyncData } from "@src/dataInterface/syncData";
import { getSelfAssessmentQuestion } from "@src/shared/components/interaction/selfAssessmentInteraction/getSelfAssessmentQuestion";

const SelfAssessmentInteraction = (props: {
  onSuccess: () => void;
  onSkip: () => void;
  onCancelCountdown: () => void;
  syncData: SyncData;
}): JSX.Element => {
  const [getSelectedQuestion, setSelectedQuestion] = createSignal(
    SELF_ASSESSMENT_QUESTIONS[0],
  );

  onMount(() => {
    setSelectedQuestion(getSelfAssessmentQuestion(props.syncData));
  });

  const handleAnswerSelect = async (answerVal: SelfReflectionAnswerVal) => {
    await saveSelfAssessment(
      getSelectedQuestion().id,
      answerVal,
    );
    props.onSuccess();
  };

  return (
    <div onmousemove={props.onCancelCountdown}>
      <div class="txtBig" style="padding-bottom: 16px;">
        Recently {getSelectedQuestion().question}
      </div>

      <TglBtns
        options={SELF_ASSESSMENT_ANSWERS}
        onSelect={handleAnswerSelect}
      />
    </div>
  );
};

export default SelfAssessmentInteraction;

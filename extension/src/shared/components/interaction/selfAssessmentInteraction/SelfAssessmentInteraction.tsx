import { createSignal, JSX, onMount } from "solid-js";
import {
  SELF_ASSESSMENT_ANSWERS,
  SELF_ASSESSMENT_QUESTIONS,
  SelfReflectionAnswerVal,
} from "./selfAssessment.model";
import { SaveBtn } from "@src/shared/components/ui/SaveBtn";
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
  const [getSelectedAnswerVal, setSelectedAnswerVal] =
    createSignal<SelfReflectionAnswerVal | null>(null);

  onMount(() => {
    setSelectedQuestion(getSelfAssessmentQuestion(props.syncData));
  });

  const handleSaveClick = async () => {
    if (getSelectedAnswerVal()) {
      await saveSelfAssessment(
        getSelectedQuestion().id,
        getSelectedAnswerVal(),
      );
      props.onSuccess();
    }
  };

  return (
    <div onmousemove={props.onCancelCountdown}>
      <div class="txtBig" style="padding-bottom: 32px;">
        Recently {getSelectedQuestion().question}
      </div>

      <TglBtns
        options={SELF_ASSESSMENT_ANSWERS}
        onSelect={(v) => setSelectedAnswerVal(v)}
      />

      <SaveBtn onSave={handleSaveClick} isVisible={!!getSelectedAnswerVal()} />
    </div>
  );
};

export default SelfAssessmentInteraction;

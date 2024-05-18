import { createSignal, JSX } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { QuestionCategoryView } from "@src/shared/components/dashboard/questionCategoryView/QuestionCategoryView";
import BottomBar from "@src/shared/components/dashboard/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";

export const Dashboard: () => JSX.Element = () => {
  const [getSelectedQuestionCategoryId, setSelectedQuestionCategoryId] =
    createSignal<QuestionCategoryId | null>(null);
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(false);

  // return <QuestionsForToday />;

  return (
    <div>
      {getSelectedQuestionCategoryId() ? (
        <QuestionCategoryView
          questionCategoryId={getSelectedQuestionCategoryId()}
          onLeave={() => setSelectedQuestionCategoryId(null)}
        />
      ) : (
        <>
          <DashboardGroups
            onQuestionCategorySelect={(id) => setSelectedQuestionCategoryId(id)}
          />
          <BottomBar onShowQuestion={() => setIsShowQuestionOverlay(true)} />
        </>
      )}

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          onHideInteraction={() => setIsShowQuestionOverlay(false)}
        />
      )}
    </div>
  );
};

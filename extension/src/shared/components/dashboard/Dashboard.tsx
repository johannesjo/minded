import { createSignal, JSX } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import BottomBar from "@src/shared/components/dashboard/BottomBar";
import InteractionOverlay from "@src/shared/components/dashboard/interactionOverlay/InteractionOverlay";
import { useNavigate } from "@solidjs/router";

export const Dashboard: () => JSX.Element = () => {
  const [getIsShowQuestionOverlay, setIsShowQuestionOverlay] =
    createSignal<boolean>(false);
  const navigate = useNavigate();

  // return <QuestionsForToday />;
  const goToCategoryPage = (id: string) => {
    navigate(`/questionCategory/${id}`);
  };

  return (
    <div>
      <DashboardGroups
        onQuestionCategorySelect={(id) => goToCategoryPage(id)}
      />
      <BottomBar onShowQuestion={() => setIsShowQuestionOverlay(true)} />

      {getIsShowQuestionOverlay() && (
        <InteractionOverlay
          onHideInteraction={() => setIsShowQuestionOverlay(false)}
        />
      )}
    </div>
  );
};

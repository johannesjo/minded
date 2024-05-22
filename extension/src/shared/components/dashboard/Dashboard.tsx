import { JSX } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import { useNavigate } from "@solidjs/router";

export const Dashboard: () => JSX.Element = () => {
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
    </div>
  );
};

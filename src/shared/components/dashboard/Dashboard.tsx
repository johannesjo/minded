import { createSignal, JSX } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { QuestionCategoryView } from "@src/shared/components/dashboard/questionCategoryView/QuestionCategoryView";

export const Dashboard: () => JSX.Element = () => {
  const [getSelectedQuestionCategoryId, setSelectedQuestionCategoryId] =
    createSignal<QuestionCategoryId | null>(null);

  return (
    <div>
      {getSelectedQuestionCategoryId() ? (
        <QuestionCategoryView
          questionCategoryId={getSelectedQuestionCategoryId()}
          onLeave={() => setSelectedQuestionCategoryId(null)}
        />
      ) : (
        <DashboardGroups
          onQuestionCategorySelect={(id) => setSelectedQuestionCategoryId(id)}
        />
      )}
    </div>
  );
};

import { createSignal, JSX, onCleanup, onMount } from "solid-js";
import { DashboardGroups } from "@src/shared/components/dashboard/DashboardGroups";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { QuestionCategoryView } from "@src/shared/components/dashboard/questionCategoryView/QuestionCategoryView";
import { IS_ANDROID } from "@src/dataInterface/extension/isAndroid";

export const Dashboard: () => JSX.Element = () => {
  const [getSelectedQuestionCategoryId, setSelectedQuestionCategoryId] =
    createSignal<QuestionCategoryId | null>(null);
  const [getIsShowContainer, setIsShowContainer] = createSignal<boolean>(true);

  let t0;

  const refresh = () => {
    setIsShowContainer(false);
    t0 = setTimeout(() => setIsShowContainer(true), 10);
  };

  onMount(() => {
    refresh();
    if (IS_ANDROID) {
      window.addEventListener("androidAppResume", refresh);
    }
  });
  onCleanup(() => {
    window.clearTimeout(t0);
    if (IS_ANDROID) {
      window.removeEventListener("androidAppResume", refresh);
    }
  });

  return (
    <>
      {getIsShowContainer() && (
        <div>
          {getSelectedQuestionCategoryId() ? (
            <QuestionCategoryView
              questionCategoryId={getSelectedQuestionCategoryId()}
              onLeave={() => setSelectedQuestionCategoryId(null)}
            />
          ) : (
            <DashboardGroups
              onQuestionCategorySelect={(id) =>
                setSelectedQuestionCategoryId(id)
              }
            />
          )}
        </div>
      )}
    </>
  );
};

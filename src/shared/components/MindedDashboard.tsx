import { createSignal, JSX, onMount } from "solid-js";
import "./MindedDashboard.scss";
import { getSyncData } from "@src/shared/data/dataInterface";
import { Answer } from "@src/shared/data/sync-data";
import { groupBy } from "@src/util/groupBy";
import {
  QUESTION_CATEGORIES,
  QUESTION_CATEGORIES_ON_DASHBOARD,
  Questions,
  QuestionCategoryId,
} from "@src/shared/data/questions";

interface DashboardGroup {
  id: QuestionCategoryId;
  dashboardTxt: string;
  answers: Answer[];
}

const dashboardEntriesFromQuestions = (answers: Answer[]): DashboardGroup[] => {
  const entries = groupBy(answers, (q) => q.questionCategoryId);
  const dashboardGroups = [];
  QUESTION_CATEGORIES_ON_DASHBOARD.forEach((catId) => {
    const answersForCat = answers.filter(
      (answer) => answer.questionCategoryId === catId,
    );
    if (answersForCat?.length) {
      dashboardGroups.push({
        id: catId,
        dashboardTxt: QUESTION_CATEGORIES[catId].dashboardTxt,
        answers: answersForCat,
      });
    }
  });


  return dashboardGroups;
};

export const MindedDashboard: () => JSX.Element = () => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData.answers);
        console.log(entries);

        setDashboardGroups(entries);
      }
    });
  });

  return (
    <>
      <div id="minded-6622-coloured-wrapper">
        <div className="box-wrapper">
          {getDashboardGroups().map((dg) => (
            <div className="box">
              <div className="category-title" title="Show all">
                {dg.dashboardTxt}
              </div>
              {dg.answers.map((dga) => (
                <div className="user-quote">{dga.val}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

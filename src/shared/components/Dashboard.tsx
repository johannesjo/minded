import { createSignal, JSX, onMount } from "solid-js";
import "./Dashboard.scss";
import { getSyncData } from "@src/shared/data/dataInterface";
import { Answer } from "@src/shared/data/sync-data";
import {
  QUESTION_CATEGORIES,
  QUESTION_CATEGORIES_ON_DASHBOARD,
  QuestionCategoryId,
} from "@src/shared/data/questions";
import { truncate } from "@src/util/truncate";

const MAX_ANSWERS = 3;
const MAX_ANSWER_LENGTH = 200;

interface DashboardGroup {
  id: QuestionCategoryId;
  dashboardTxt: string;
  answers: Answer[];
}

const dashboardEntriesFromQuestions = (answers: Answer[]): DashboardGroup[] => {
  const dashboardGroups = [];
  QUESTION_CATEGORIES_ON_DASHBOARD.forEach((catId) => {
    const answersForCat = answers.filter(
      (answer) => answer.questionCategoryId === catId,
    );
    if (answersForCat?.length) {
      dashboardGroups.push({
        id: catId,
        dashboardTxt: QUESTION_CATEGORIES[catId].dashboardTxt,
        // TODO more sophisticated algorithm based on character length
        answers: answersForCat.slice(-1 * MAX_ANSWERS),
      });
    }
  });

  return dashboardGroups;
};

export const Dashboard: () => JSX.Element = () => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.answers?.length) {
        const entries = dashboardEntriesFromQuestions(syncData.answers);
        setDashboardGroups(entries);
      }
    });
  });

  return (
    <>
      <div id="minded-6622-coloured-wrapper">
        <div
          nr-of-items={getDashboardGroups().length}
          className="box-wrapper"
        >
          {getDashboardGroups().map((dg) => (
            <div className="box">
              <div className="category-title" title="Show all">
                {dg.dashboardTxt}
              </div>
              {dg.answers.map((dga) => (
                <div
                  className="user-quote"
                  title={dga.val.length > MAX_ANSWER_LENGTH ? dga.val : ""}
                >
                  {truncate(dga.val, MAX_ANSWER_LENGTH)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

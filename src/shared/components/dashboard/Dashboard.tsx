import { createSignal, JSX, onMount } from "solid-js";
import styles from "./Dashboard.module.scss";
import { getSyncData } from "@src/shared/data/dataInterface";
import { Answer } from "@src/shared/data/sync-data";
import {
  QUESTION_CATEGORIES,
  QUESTION_CATEGORIES_ON_DASHBOARD,
} from "@src/shared/data/questions";
import {
  DashboardGroup,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import { AnswerList } from "@src/shared/components/dashboard/AnswerList";
import { getRndEntries } from "@src/util/getRndEntries";
import { RndQuote } from "@src/shared/components/dashboard/RndQuote";

const MAX_ANSWERS = 4;
const MAX_GROUPS = 9;

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
        answers: getRndEntries(answersForCat, MAX_ANSWERS),
        type: DashboardGroupType.Standard,
      });
    }
  });
  console.log(dashboardGroups, getRndEntries(dashboardGroups, MAX_GROUPS));

  // const answerEntries = getRndEntries(dashboardGroups, MAX_GROUPS);
  const answerEntries = dashboardGroups.slice(-1 * MAX_GROUPS);

  answerEntries.splice(4, 0, {
    type: DashboardGroupType.Quote,
  });
  return answerEntries;
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

  const STATIC_ITEMS = 1;

  return (
    <div
      nr-of-items={getDashboardGroups().length + STATIC_ITEMS}
      class={styles.Dashboard}
    >
      {getDashboardGroups().map((dg) => {
        switch (dg.type) {
          case DashboardGroupType.Quote:
            return (
              <div className={styles.box}>
                <RndQuote />
              </div>
            );
          default:
            return (
              <div className={styles.box}>
                <AnswerList dashboardGroup={dg} />
              </div>
            );
        }
      })}
    </div>
  );
};

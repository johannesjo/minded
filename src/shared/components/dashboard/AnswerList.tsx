import { JSX } from "solid-js";
import styles from "./AnswerList.module.scss";
import { truncate } from "@src/util/truncate";
import { DashboardGroup } from "@src/shared/components/dashboard/dashboard.model";

const MAX_ANSWER_LENGTH = 200;

export const AnswerList: (props: {
  dashboardGroup: DashboardGroup;
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      <div class={styles.categoryTitle} title="Show all">
        {props.dashboardGroup.dashboardTxt}
      </div>
      {props.dashboardGroup.answers.map((answer) => (
        <div
          class={styles.userQuote}
          title={answer.val.length > MAX_ANSWER_LENGTH ? answer.val : ""}
        >
          {truncate(answer.val, MAX_ANSWER_LENGTH)}
        </div>
      ))}
    </div>
  );
};

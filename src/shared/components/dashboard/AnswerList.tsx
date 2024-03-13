import { JSX } from "solid-js";
import styles from "./AnswerList.module.scss";
import { truncate } from "@src/util/truncate";
import { DashboardGroupStandard } from "@src/shared/components/dashboard/dashboard.model";

const MAX_ANSWER_LENGTH = 200;

export const AnswerList: (props: {
  dashboardGroup: DashboardGroupStandard;
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      <div class={styles.categoryTitle} title="Show all">
        {props.dashboardGroup.dashboardTxt}
      </div>
      {props.dashboardGroup.answers.map((answer) => (
        <div
          class={styles.userQuote}
          title={
            answer.val.toString().length > MAX_ANSWER_LENGTH
              ? answer.val.toString()
              : ""
          }
        >
          {truncate(answer.val.toString(), MAX_ANSWER_LENGTH)}
        </div>
      ))}
    </div>
  );
};

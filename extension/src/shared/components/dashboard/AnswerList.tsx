import { For, JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerList.module.scss";
import { DashboardGroupTxtQuestion } from "@src/shared/components/dashboard/dashboard.model";
import { truncate } from "@src/util/truncate";
import { QUESTIONS } from "@src/shared/data/questions";

const MAX_ANSWER_LENGTH = 200;

export const AnswerList: (props: {
  dashboardGroup: DashboardGroupTxtQuestion;
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      <div
        classList={{
          [styles.categoryTitle]: true,
          ["h4"]: true,
        }}
      >
        {props.dashboardGroup.dashboardTxt}
      </div>

      <For each={props.dashboardGroup.answers}>
        {(answer) => {
          const question = QUESTIONS.find((q) => q.id === answer.qid);
          const questionTxt =
            answer.qid && question ? `Question: ${question.t}?` : "";
          const titleTxt =
            answer.val.toString().length > MAX_ANSWER_LENGTH
              ? answer.qid
                ? `${answer.val.toString()} – ${questionTxt}`
                : answer.val.toString()
              : questionTxt;

          return (
            <div class="userQuote" title={titleTxt}>
              {truncate(answer.val.toString(), MAX_ANSWER_LENGTH)}
            </div>
          );
        }}
      </For>
    </div>
  );
};

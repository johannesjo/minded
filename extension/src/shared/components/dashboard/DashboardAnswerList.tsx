import { For, JSX } from "solid-js";
// @ts-ignore
import styles from "./DashboardAnswerList.module.scss";
import { DashboardGroupTxtQuestion } from "@src/shared/components/dashboard/dashboard.model";
import { truncate } from "@src/util/truncate";
import { QUESTIONS } from "@src/shared/data/questions";
import { formatQuestionText } from "@src/util/formatQuestionText";

const MAX_ANSWER_LENGTH = 200;

export const DashboardAnswerList: (props: {
  dashboardGroup: DashboardGroupTxtQuestion;
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      <div
        classList={{
          [styles.categoryTitle]: true,
          ["dashboardHeading"]: true,
          // Global hook so the enlarged single greeting card can keep *this*
          // label (a category, not a heading) at its resting size while the
          // reflection grows. The .categoryTitle module class is hashed, so a
          // cross-module selector needs a stable global name to target.
          ["dashboardCategory"]: true,
        }}
      >
        {props.dashboardGroup.dashboardTxt}
      </div>

      <For each={props.dashboardGroup.answers}>
        {(answer) => {
          const question = QUESTIONS.find((q) => q.id === answer.qid);
          const questionTxt =
            answer.qid && question
              ? `Question: ${formatQuestionText(question.t)}`
              : "";
          const titleTxt =
            answer.val.toString().length > MAX_ANSWER_LENGTH
              ? answer.qid
                ? `${answer.val.toString()} – ${questionTxt}`
                : answer.val.toString()
              : questionTxt;

          return (
            <div class="dashboardContent" title={titleTxt}>
              {truncate(answer.val.toString(), MAX_ANSWER_LENGTH)}
            </div>
          );
        }}
      </For>
    </div>
  );
};

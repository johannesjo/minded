import { For, JSX } from "solid-js";
// @ts-ignore
import styles from "./DashboardAnswerList.module.scss";
import { DashboardGroupTxtQuestion } from "@src/shared/components/dashboard/dashboard.model";
import { truncate } from "@src/util/truncate";
import { QUESTIONS } from "@src/shared/data/questions";
import { formatQuestionText } from "@src/util/formatQuestionText";
import { CustomQuestion } from "@src/dataInterface/syncData";

const MAX_ANSWER_LENGTH = 200;

export const DashboardAnswerList: (props: {
  dashboardGroup: DashboardGroupTxtQuestion;
  /** The user's own questions, for answers whose qid isn't in the static pool. */
  customQuestions?: CustomQuestion[];
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
          const question = answer.qid
            ? (QUESTIONS.find((q) => q.id === answer.qid) ??
              props.customQuestions?.find((cq) => cq.id === answer.qid))
            : undefined;
          const questionTxt = question
            ? `Question: ${formatQuestionText(question.t)}`
            : "";
          const titleTxt =
            answer.val.toString().length > MAX_ANSWER_LENGTH
              ? questionTxt
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

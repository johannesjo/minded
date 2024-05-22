import { JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerList.module.scss";
import { DashboardGroupStandard } from "@src/shared/components/dashboard/dashboard.model";
import { truncate } from "@src/util/truncate";
import { QUESTIONS } from "@src/shared/data/questions";

const MAX_ANSWER_LENGTH = 200;

export const AnswerList: (props: {
  dashboardGroup: DashboardGroupStandard;
  onTitleClick: () => void;
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      <div
        class={styles.categoryTitle}
        title="Show all"
        onClick={props.onTitleClick}
      >
        {props.dashboardGroup.dashboardTxt}
      </div>

      {/*<AnswerListEditable*/}
      {/*  isShowAdd={false}*/}
      {/*  questionCategoryId={props.dashboardGroup.val}*/}
      {/*  answers={props.dashboardGroup.answers}*/}
      {/*  onEdit={() => undefined}*/}
      {/*  onRemove={() => undefined}*/}
      {/*  onAdd={() => undefined}*/}
      {/*/>*/}

      {props.dashboardGroup.answers.map((answer) => {
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
          <div class={styles.userQuote} title={titleTxt}>
            {truncate(answer.val.toString(), MAX_ANSWER_LENGTH)}
          </div>
        );
      })}
    </div>
  );
};

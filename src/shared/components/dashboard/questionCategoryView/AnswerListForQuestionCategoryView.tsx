import { JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerListForQuestionCategoryView.module.scss";
import { Answer } from "@src/shared/data/sync-data";

import { AnswerEntry } from "@src/shared/components/dashboard/questionCategoryView/AnswerEntry";

const MAX_ANSWER_LENGTH = 200;

export const AnswerListForQuestionCategoryView: (props: {
  answers: Answer[];
  onEdit: (upd: Answer) => void;
  onRemove: (id: string) => void;
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      {props.answers.map((answer, i) => (
        <AnswerEntry
          answer={answer}
          onEdit={(upd) => props.onEdit(upd)}
          onRemove={() => props.onRemove(answer.id)}
        />
      ))}
    </div>
  );
};

import { createSignal, JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerListForQuestionCategoryView.module.scss";
import { Answer } from "@src/shared/data/sync-data";

import { AnswerEntry } from "@src/shared/components/dashboard/questionCategoryView/AnswerEntry";
import { nanoid } from "nanoid";
import { QuestionCategoryId } from "@src/shared/data/questions";

const MAX_ANSWER_LENGTH = 200;

export const AnswerListForQuestionCategoryView: (props: {
  questionCategoryId: QuestionCategoryId;
  answers: Answer[];
  onEdit: (upd: Answer) => void;
  onRemove: (id: string) => void;
  onAdd: (newAnswer: Answer) => void;
}) => JSX.Element = (props) => {
  const [getIsAddMode, setIsAddMode] = createSignal(false);

  return (
    <div class={styles.AnswerList}>
      {props.answers.map((answer, i) => (
        <AnswerEntry
          answer={answer}
          onEdit={(upd) => props.onEdit(upd)}
          onRemove={() => props.onRemove(answer.id)}
        />
      ))}

      <div class={styles.addItem}>
        {getIsAddMode() ? (
          <AnswerEntry
            isInitialEditMode={true}
            onBlur={() => setIsAddMode(false)}
            answer={{
              id: nanoid(),
              ts: Date.now(),
              val: "",
              questionCategoryId: props.questionCategoryId,
            }}
            onEdit={(newAnswer) => {
              setIsAddMode(false);
              if (newAnswer.val.toString().trim().length > 1) {
                props.onAdd(newAnswer);
              }
            }}
            onRemove={() => setIsAddMode(false)}
          />
        ) : (
          <button class="btn-ico" onClick={() => setIsAddMode(true)}>
            +
          </button>
        )}
      </div>
    </div>
  );
};

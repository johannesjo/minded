import { createSignal, JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerListEditable.module.scss";
import { Answer } from "@src/shared/data/syncData";

import { AnswerEntry } from "@src/shared/components/dashboard/questionCategoryView/AnswerEntry";
import { nanoid } from "nanoid";
import { QuestionCategoryId } from "@src/shared/data/questions";

export const AnswerListEditable: (props: {
  isShowAdd: boolean;
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

      {props.isShowAdd && (
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
            <button class="btn-big" onClick={() => setIsAddMode(true)}>
              + Add
            </button>
          )}
        </div>
      )}
    </div>
  );
};

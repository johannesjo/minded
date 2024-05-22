import { createSignal, For, JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerListEditable.module.scss";
import { Answer } from "@src/dataInterface/syncData";

import { AnswerEntry } from "@src/shared/components/questionCategoryView/AnswerEntry";
import { nanoid } from "nanoid";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";

export const AnswerListEditable: (props: {
  isShowAdd: boolean;
  questionCategoryId: QuestionCategoryId;
  answers: Answer[];
  onEdit: (upd: Answer) => void;
  onRemove: (id: string) => void;
  onBack: () => void;
  onAdd: (newAnswer: Answer) => void;
}) => JSX.Element = (props) => {
  const [getIsAddMode, setIsAddMode] = createSignal(false);

  return (
    <div class={styles.AnswerListEditable}>
      <For each={props.answers}>
        {(answer, i) => (
          <AnswerEntry
            answer={answer}
            onEdit={(upd) => props.onEdit(upd)}
            onRemove={() => props.onRemove(answer.id)}
          />
        )}
      </For>

      {props.isShowAdd && (
        <div class={styles.addItem}>
          {getIsAddMode() ? (
            <AnswerEntry
              isInitialEditMode={true}
              onBlur={() => setIsAddMode(false)}
              answer={{
                id: nanoid(),
                ts: Date.now(),
                qid: QID.ADDED_FROM_DASHBOARD,
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
            <div>
              <button class="btnTxt" onClick={() => props.onBack()}>
                ↖ Back
              </button>
              <button
                class="btnTxt"
                style="margin-left: 16px"
                onClick={() => setIsAddMode(true)}
              >
                + Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { createSignal, For, JSX, Show } from "solid-js";
// @ts-ignore
import styles from "./AnswerListEditable.module.scss";
import { Answer } from "@src/dataInterface/syncData";

import { AnswerEntry } from "@src/shared/components/questionCategoryView/AnswerEntry";
import { nanoid } from "nanoid";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { QID } from "@src/shared/data/questionId";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";

export const AnswerListEditable: (props: {
  isShowAdd: boolean;
  questionCategoryId: QuestionCategoryId;
  answers: Answer[];
  onEdit: (upd: Answer) => void;
  onRemove: (id: string) => void;
  onAdd: (newAnswer: Answer) => void;
}) => JSX.Element = (props) => {
  let addActionEl: HTMLDivElement = undefined!;
  const [getIsAddMode, setIsAddMode] = createSignal(false);

  const cancelAdd = () => {
    setIsAddMode(false);
    setTimeout(() => addActionEl?.querySelector("button")?.focus());
  };

  return (
    <div class={styles.AnswerListEditable}>
      <div class={styles.answerList}>
        <Show when={props.answers.length === 0 && !getIsAddMode()}>
          <p class={styles.emptyState}>Your reflections will gather here.</p>
        </Show>

        <For each={props.answers}>
          {(answer) => (
            <AnswerEntry
              answer={answer}
              onEdit={(upd) => props.onEdit(upd)}
              onRemove={() => props.onRemove(answer.id)}
            />
          )}
        </For>
      </div>

      {props.isShowAdd && (
        <div class={styles.addItem}>
          {getIsAddMode() ? (
            <AnswerEntry
              isInitialEditMode={true}
              onBlur={() => setIsAddMode(false)}
              onCancel={cancelAdd}
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
            <div
              class={styles.addAction}
              ref={(el) => {
                addActionEl = el;
              }}
            >
              <Btn onClick={() => setIsAddMode(true)}>
                <Ico name="add" /> Add
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

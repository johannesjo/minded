import { Answer } from "@src/dataInterface/syncData";
import { createSignal, JSX } from "solid-js";
import styles from "@src/shared/components/questionCategoryView/AnswerEntry.module.scss";
import { Ico } from "@src/shared/components/ui/Ico";
import { QUESTIONS } from "@src/shared/data/questions";

export const AnswerEntry: (props: {
  answer: Answer;
  isInitialEditMode?: boolean;
  onEdit: (upd: Answer) => void;
  onBlur?: () => void;
  onRemove: () => void;
}) => JSX.Element = (props) => {
  let inpEl: HTMLInputElement = undefined!;
  let cardEl: HTMLDivElement = undefined!;

  const [getTitle, setTitle] = createSignal<string>(props.answer.val as string);
  const [getIsEditMode, setIsEditMode] = createSignal<boolean>(
    props.isInitialEditMode || false,
    // true,
  );
  const [getIsShowEditBar, setIsShowEditBar] = createSignal<boolean>(false);
  const question = props.answer.qid
    ? QUESTIONS.find((q) => q.id === props.answer.qid)
    : null;

  if (props.isInitialEditMode) {
    inpEl?.focus();
    setTimeout(() => inpEl?.focus());
  }

  const abortEdit = () => {
    setIsEditMode(false);
    setTitle(props.answer.val.toString());
  };

  const triggerEdit = () => {
    setIsEditMode(true);
    inpEl?.focus();
    setTimeout(() => inpEl?.focus());
  };

  return (
    <div
      class={styles.AnswerEntry + " card"}
      ref={cardEl}
      onClick={() => {
        setIsShowEditBar(!getIsShowEditBar());
      }}
    >
      {question && <div class={styles.question}>{question.t}?</div>}

      {!getIsEditMode() && (
        <>
          <div class={styles.answer}>{props.answer.val.toString()}</div>

          <div
            class={styles.createdAt}
            title={
              "Created on " +
              new Date(props.answer.ts).toLocaleDateString() +
              " – " +
              new Date(props.answer.ts).toLocaleTimeString()
            }
          >
            {new Date(props.answer.ts).toLocaleDateString()}
          </div>
        </>
      )}

      {!getIsEditMode() && (
        <div class={styles.editBar}>
          <button
            class="btnIco isSmall"
            aria-label="Edit answer"
            onClick={triggerEdit}
          >
            <Ico name="edit" />
          </button>
          <button
            class="btnIco isSmall"
            aria-label="Delete answer"
            onClick={props.onRemove}
          >
            <Ico name="deleteForever" />
          </button>
        </div>
      )}

      {!!getIsEditMode() && (
        <div class={styles.editModeWrapper}>
          <input
            ref={inpEl}
            value={getTitle()}
            type="text"
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                inpEl?.blur();
              } else if (ev.key === "Escape") {
                ev.preventDefault();
                ev.stopPropagation();
                abortEdit();
              }
            }}
            onInput={(ev) => {
              setTitle(ev.currentTarget.value);
            }}
            onblur={() => {
              if (getIsEditMode()) {
                props.onBlur?.();
                if (getTitle().trim().length > 0) {
                  props.onEdit({
                    ...props.answer,
                    val: getTitle(),
                  });
                }
                setIsEditMode(false);
              }
            }}
            maxlength={500}
          />

          <button
            class="btnIco isSmall"
            aria-label="Confirm edit"
            onClick={() => {}}
          >
            <Ico name="check" />
          </button>
        </div>
      )}
    </div>
  );
};

import { Answer } from "@src/dataInterface/syncData";
import { createSignal, JSX } from "solid-js";
// @ts-ignore
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
  let inpEl;
  let cardEl;

  const [getTitle, setTitle] = createSignal<string>(props.answer.val as string);
  const [getIsEditMode, setIsEditMode] = createSignal<boolean>(
    props.isInitialEditMode,
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
        <div
          class={styles.answer}
          title={
            "Created on " +
            new Date(props.answer.ts).toLocaleDateString() +
            " – " +
            new Date(props.answer.ts).toLocaleTimeString()
          }
        >
          {props.answer.val.toString()}
        </div>
      )}

      {getIsShowEditBar() && !getIsEditMode() && (
        <div class={styles.editBar}>
          <button class="btnIco" onClick={triggerEdit}>
            <Ico name="edit" />
          </button>
          <button class="btnIco" onClick={props.onRemove}>
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
              setTitle((ev.target as any).value);
            }}
            onblur={() => {
              if (getIsEditMode()) {
                props.onBlur?.();
                if (getTitle() !== props.answer.val) {
                  props.onEdit({
                    ...props.answer,
                    val: getTitle(),
                  });
                }
                setIsEditMode(false);
              }
            }}
            maxlength={500}
            autofocus={true}
          />
        </div>
      )}
    </div>
  );
};

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

  const [getTitle, setTitle] = createSignal<string>(props.answer.val as string);
  const [getIsEditMode, setIsEditMode] = createSignal<boolean>(
    props.isInitialEditMode,
    // true,
  );
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

  return (
    <div
      class={styles.AnswerEntry + " card"}
      onClick={() => {
        setIsEditMode(true);
        inpEl?.focus();
        setTimeout(() => inpEl?.focus());
      }}
    >
      {question && <div class={styles.question}>{question.t}?</div>}

      {!getIsEditMode() && (
        <div
          style={{ visibility: getIsEditMode() ? "hidden" : "visible" }}
          class={styles.answer}
          title={
            "Click to edit! Created on " +
            new Date(props.answer.ts).toLocaleDateString() +
            " – " +
            new Date(props.answer.ts).toLocaleTimeString()
          }
        >
          {props.answer.val.toString()}
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
          <button
            class="btnIcoSmall"
            title="Remove"
            onMouseDown={(ev) => {
              // NOTE we use mousedown since it is fired before blur
              ev.preventDefault();
              props.onRemove();
            }}
          >
            <Ico name="close" />
          </button>
        </div>
      )}
    </div>
  );
};

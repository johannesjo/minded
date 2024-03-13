import { Answer } from "@src/shared/data/sync-data";
import { createSignal, JSX } from "solid-js";
// @ts-ignore
import styles from "@src/shared/components/dashboard/questionCategoryView/AnswerEntry.module.scss";

export const AnswerEntry: (props: {
  answer: Answer;
  onEdit: (upd: Answer) => void;
  onRemove: () => void;
}) => JSX.Element = (props) => {
  let inpEl;

  const [getTitle, setTitle] = createSignal<string>(props.answer.val as string);
  const [getIsEditMode, setIsEditMode] = createSignal<boolean>(false);

  const onKeyDown = (ev: KeyboardEvent): void => {
    console.log((ev.target as any).value);
    setTitle((ev.target as any).value);
  };

  return (
    <div class={styles.AnswerEntry}>
      {!!getIsEditMode() ? (
        <div class={styles.editMode}>
          <input
            ref={inpEl}
            value={getTitle()}
            type="text"
            onkeypress={() => undefined}
            onkeydown={onKeyDown}
            onblur={() => {
              setIsEditMode(false);
              if (getTitle() !== props.answer.val) {
                props.onEdit({
                  ...props.answer,
                  val: getTitle(),
                });
              }
            }}
            maxlength={500}
            autofocus={true}
          />
          <button
            class="btn-ico"
            title="Remove"
            onMouseDown={(ev) => {
              // NOTE we use mousedown since it is fired before blur
              ev.preventDefault();
              props.onRemove();
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => {
            setIsEditMode(true);
            inpEl?.focus();
            setTimeout(() => inpEl?.focus());
          }}
          class={styles.userQuote}
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
      {/*<div class={styles.date}>*/}
      {/*  {new Date(answer.ts).toLocaleDateString()}*/}
      {/*  {" / "}*/}
      {/*  {new Date(answer.ts).toLocaleTimeString()}*/}
      {/*</div>*/}
    </div>
  );
};

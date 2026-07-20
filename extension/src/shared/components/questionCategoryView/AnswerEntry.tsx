import { Answer } from "@src/dataInterface/syncData";
import { createSignal, JSX } from "solid-js";
import styles from "@src/shared/components/questionCategoryView/AnswerEntry.module.scss";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import { QUESTIONS } from "@src/shared/data/questions";
import { formatQuestionText } from "@src/util/formatQuestionText";

export const AnswerEntry: (props: {
  answer: Answer;
  isInitialEditMode?: boolean;
  onEdit: (upd: Answer) => void;
  onBlur?: () => void;
  onCancel?: () => void;
  onRemove: () => void;
}) => JSX.Element = (props) => {
  let entryEl: HTMLDivElement = undefined!;
  let inpEl: HTMLInputElement = undefined!;

  const [getTitle, setTitle] = createSignal<string>(props.answer.val as string);
  const [getIsEditMode, setIsEditMode] = createSignal<boolean>(
    props.isInitialEditMode || false,
    // true,
  );
  const [getIsShowEditBar, setIsShowEditBar] = createSignal<boolean>(false);
  const entryDomId = `answer-entry-${props.answer.id}`;
  const question = props.answer.qid
    ? QUESTIONS.find((q) => q.id === props.answer.qid)
    : null;

  if (props.isInitialEditMode) {
    inpEl?.focus();
    setTimeout(() => inpEl?.focus());
  }

  // Editing replaces the card contents with an input. Once that input is
  // removed, put keyboard users back on the same card instead of dropping focus
  // to the document body. Look it up by its stable answer id because an edit
  // replaces the answer object and can remount this component before the focus
  // callback runs. Defer one turn so the non-edit tabindex is mounted.
  const restoreEntryFocus = () => {
    setTimeout(() => {
      entryEl.ownerDocument.getElementById(entryDomId)?.focus();
    });
  };

  const abortEdit = () => {
    const isCanceledByParent = props.onCancel !== undefined;
    props.onCancel?.();
    if (isCanceledByParent) return;
    setIsEditMode(false);
    setTitle(props.answer.val.toString());
    restoreEntryFocus();
  };

  const triggerEdit = () => {
    setIsEditMode(true);
    inpEl?.focus();
    setTimeout(() => inpEl?.focus());
  };

  return (
    <div
      id={entryDomId}
      ref={(el) => {
        entryEl = el;
      }}
      classList={{
        [styles.AnswerEntry]: true,
        ["card"]: true,
        [styles.isEditBarVisible]: getIsShowEditBar(),
      }}
      role="group"
      aria-label={`Reflection from ${new Date(
        props.answer.ts,
      ).toLocaleDateString()}`}
      tabindex={getIsEditMode() ? undefined : 0}
      onClick={() => {
        setIsShowEditBar(true);
      }}
      onFocusIn={() => setIsShowEditBar(true)}
      onFocusOut={(ev) => {
        const nextTarget = ev.relatedTarget as Node | null;
        if (!nextTarget || !ev.currentTarget.contains(nextTarget)) {
          setIsShowEditBar(false);
        }
      }}
    >
      {question && (
        <div class={styles.question}>{formatQuestionText(question.t)}</div>
      )}

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
          <Btn
            variant="icon"
            small
            aria-label="Edit answer"
            onClick={triggerEdit}
          >
            <Ico name="edit" />
          </Btn>
          <Btn
            variant="icon"
            small
            aria-label="Delete answer"
            onClick={props.onRemove}
          >
            <Ico name="deleteForever" />
          </Btn>
        </div>
      )}

      {!!getIsEditMode() && (
        <div class={styles.editModeWrapper}>
          <input
            ref={(el) => {
              inpEl = el;
            }}
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
            onBlur={(ev) => {
              if (getIsEditMode()) {
                // Keep an intentional move outside the card intact. Enter and
                // the in-card confirm control otherwise leave focus on a node
                // that is about to unmount, so return those paths to the card.
                const nextTarget = ev.relatedTarget as Node | null;
                const shouldRestoreFocus =
                  !nextTarget || entryEl.contains(nextTarget);
                props.onBlur?.();
                if (getTitle().trim().length > 0) {
                  props.onEdit({
                    ...props.answer,
                    val: getTitle(),
                  });
                }
                setIsEditMode(false);
                if (shouldRestoreFocus) restoreEntryFocus();
              }
            }}
            maxlength={500}
          />

          {/* Deliberately an empty onClick: tapping this button blurs the
              input, and the input's own onblur is the single commit path - a
              second commit here would race it. The button exists as the
              visible "done" affordance and hit target for that blur. */}
          <Btn
            variant="icon"
            small
            aria-label="Confirm edit"
            onClick={() => {}}
          >
            <Ico name="check" />
          </Btn>
        </div>
      )}
    </div>
  );
};

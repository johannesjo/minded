import { createSignal, For, JSX, onMount, Show } from "solid-js";
import {
  getSyncData,
  removeCustomQuestion,
  saveCustomQuestion,
} from "@src/dataInterface/commonSyncDataInterface";
import type { CustomQuestion } from "@src/dataInterface/syncData";
import { createCustomQuestion } from "@src/shared/data/customQuestions";
import Btn from "@src/shared/components/ui/Btn";
import { Ico } from "@src/shared/components/ui/Ico";
import { TextInput } from "@src/shared/components/ui/TextInput";
import styles from "./CustomQuestionsSettings.module.scss";

const byCreated = (a: CustomQuestion, b: CustomQuestion): number =>
  a.createdTS - b.createdTS;

/**
 * One row: the question in the user's words, editable in place, plus a way to
 * take it back. Keeps its own draft so typing doesn't fight the stored value;
 * commits on blur or Enter, same as the alternatives list it mirrors.
 */
const QuestionRow = (props: {
  question: CustomQuestion;
  isAutoFocus?: boolean;
  onCommit: (value: string) => void;
  onRemove: () => void;
}): JSX.Element => {
  const [getDraft, setDraft] = createSignal(props.question.t);
  // Reaching for ✕ blurs the field first, and again on the way out after the
  // click. Committing on either would re-add what the user just discarded, so
  // the button flags its intent on the way in and keeps it set on the way out.
  let isRemoveIntent = false;

  return (
    <div
      class={styles.row}
      onFocusIn={(event) => {
        if ((event.target as HTMLElement).tagName !== "BUTTON") {
          isRemoveIntent = false;
        }
      }}
      onFocusOut={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (
          isRemoveIntent ||
          (nextTarget && event.currentTarget.contains(nextTarget))
        ) {
          return;
        }
        props.onCommit(getDraft());
      }}
    >
      <TextInput
        value={getDraft()}
        placeholder="What would feel good right now?"
        ariaLabel="Your own question"
        ref={(el) => {
          if (props.isAutoFocus) setTimeout(() => el.focus());
        }}
        onInput={(value) => setDraft(value)}
        onEnter={(value) => props.onCommit(value)}
      />
      <Btn
        variant="icon"
        small
        title="Remove"
        aria-label={`Remove ${props.question.t || "question"}`}
        onPointerDown={() => {
          isRemoveIntent = true;
        }}
        onClick={() => {
          isRemoveIntent = true;
          props.onRemove();
        }}
      >
        <Ico name="close" />
      </Btn>
    </div>
  );
};

/**
 * Questions in the user's own words. The sun asks them alongside the built-in
 * pool, and their answers gather on the dashboard like any other reflection.
 * Nothing here counts or scores; it is only the list, editable. Rewording a
 * question keeps its id, so the reflections already given to it stay attached;
 * removing one keeps its answers too - they are the user's, not the question's.
 */
export const CustomQuestionsSettings = (props: {
  initialCustomQuestions?: CustomQuestion[];
}): JSX.Element => {
  const [getQuestions, setQuestions] = createSignal<CustomQuestion[]>(
    props.initialCustomQuestions ?? [],
  );
  // The just-removed entry, so an accidental delete can be undone in place -
  // the same quiet safety net the alternatives and answer lists carry.
  const [getRemoved, setRemoved] = createSignal<CustomQuestion | null>(null);
  const [getIsSaveFailed, setIsSaveFailed] = createSignal(false);
  // The blank row waiting for a first keystroke. Kept out of the stored list so
  // an abandoned row simply disappears.
  const [getDraftQuestion, setDraftQuestion] =
    createSignal<CustomQuestion | null>(null);

  const readFromStorage = () =>
    getSyncData().then(
      (syncData) => setQuestions(syncData.customQuestions ?? []),
      (error: unknown) => {
        console.error("Could not read the custom questions", error);
      },
    );

  onMount(() => {
    if (props.initialCustomQuestions !== undefined) return;
    void readFromStorage();
  });

  // Every write goes through one chain - two writes started in the same tick
  // would both rebase on the pre-change data and the later one silently undo
  // the earlier (see AlternativesSettings for the full story).
  let pendingWrite: Promise<unknown> = Promise.resolve();

  const write = (run: () => Promise<void>): void => {
    pendingWrite = pendingWrite.then(run).then(undefined, (error: unknown) => {
      console.error("Could not save the custom questions", error);
      setRemoved(null);
      setIsSaveFailed(true);
      return readFromStorage();
    });
  };

  const commit = (question: CustomQuestion, value: string) => {
    const trimmed = value.trim();
    // An emptied row is not a delete - there is a button for that, and losing
    // an entry to a stray select-all would be the opposite of a safety net.
    if (!trimmed || trimmed === question.t) return;

    const reworded = { ...question, t: trimmed };
    setIsSaveFailed(false);
    setQuestions(
      getQuestions().map((existing) =>
        existing.id === question.id ? reworded : existing,
      ),
    );
    write(() => saveCustomQuestion(reworded));
  };

  const add = (value: string) => {
    const trimmed = value.trim();
    setDraftQuestion(null);
    if (!trimmed) return;

    const added = createCustomQuestion(trimmed);
    setIsSaveFailed(false);
    setQuestions([...getQuestions(), added]);
    write(() => saveCustomQuestion(added));
  };

  const remove = (question: CustomQuestion) => {
    setIsSaveFailed(false);
    setQuestions(
      getQuestions().filter((existing) => existing.id !== question.id),
    );
    setRemoved(question);
    write(() => removeCustomQuestion(question.id));
  };

  const undoRemove = () => {
    const removed = getRemoved();
    if (!removed) return;

    setRemoved(null);
    if (getQuestions().some((existing) => existing.id === removed.id)) return;

    setQuestions([...getQuestions(), removed].sort(byCreated));
    write(() => saveCustomQuestion(removed));
  };

  return (
    <div class={styles.CustomQuestionsSettings}>
      <div class={styles.header}>
        <h3 class="h3">Your own questions</h3>
      </div>
      <p class={styles.description}>
        The sun asks these now and then, alongside its own. Questions that open
        something up tend to work better than ones that keep score.
      </p>

      <div class={styles.list}>
        <Show when={!getQuestions().length && !getDraftQuestion()}>
          <p class={styles.emptyState}>Nothing here yet.</p>
        </Show>

        <For each={getQuestions()}>
          {(question) => (
            <QuestionRow
              question={question}
              onCommit={(value) => commit(question, value)}
              onRemove={() => remove(question)}
            />
          )}
        </For>

        <Show when={getDraftQuestion()}>
          {(draft) => (
            <QuestionRow
              question={draft()}
              isAutoFocus={true}
              onCommit={(value) => add(value)}
              onRemove={() => setDraftQuestion(null)}
            />
          )}
        </Show>
      </div>

      <Show when={getIsSaveFailed() || getRemoved()}>
        <div class={styles.status} aria-live="polite">
          <Show
            when={getIsSaveFailed()}
            fallback={
              <>
                <span>Removed. Answers you gave to it are kept.</span>
                <button
                  type="button"
                  class={styles.undoButton}
                  onClick={undoRemove}
                >
                  Undo
                </button>
              </>
            }
          >
            <span>Could not save. Please try again.</span>
          </Show>
        </div>
      </Show>

      <div class={styles.controls}>
        <Btn
          disabled={!!getDraftQuestion()}
          onClick={() => setDraftQuestion(createCustomQuestion(""))}
        >
          <Ico name="add" /> Add
        </Btn>
      </div>
    </div>
  );
};

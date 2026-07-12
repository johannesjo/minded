import { createSignal, JSX, onMount, Show } from "solid-js";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
} from "@src/shared/data/questions";
import styles from "@src/shared/components/questionCategoryView/QuestionCategoryView.module.scss";
import { AnswerListEditable } from "@src/shared/components/questionCategoryView/AnswerListEditable";
import {
  getSyncData,
  removeAnswer,
  saveAnswer,
  updateAnswer,
} from "@src/dataInterface/commonSyncDataInterface";
import { Answer } from "@src/dataInterface/syncData";
import { Navigate } from "@solidjs/router";
import { Location, Params } from "@solidjs/router/dist/types";
import { QUESTION_CATEGORY_ADDITIONAL_INFO } from "@src/shared/data/questionCategoryAdditional.const";

export const QuestionCategoryView: (props: {
  params: Params;
  location: Location;
  children?: JSX.Element;
  // questionCategoryId: QuestionCategoryId;
  // onLeave: () => void;
}) => JSX.Element = (props) => {
  const [getAnswersForCategory, setAnswersForCategory] = createSignal<Answer[]>(
    [],
  );
  // The just-removed answer, kept so an accidental delete can be undone in
  // place (same quiet safety net as the website list's "Undo").
  const [getRemovedAnswer, setRemovedAnswer] = createSignal<Answer | null>(
    null,
  );
  const questionCategoryId = props.params
    .questionCategoryId as QuestionCategoryId;

  if (!Object.values(QuestionCategoryId).includes(questionCategoryId)) {
    console.error("illegal route param");
    // A stale or mistyped hash shouldn't render into a broken category view —
    // land on the dashboard instead.
    return <Navigate href="/" />;
  }

  const QUESTION_CATEGORY = QUESTION_CATEGORIES[questionCategoryId];
  const isAnswerListCategory = () =>
    !!QUESTION_CATEGORY.questions?.length ||
    questionCategoryId === QuestionCategoryId.SleepWindDown;

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.answers?.length) {
        setAnswersForCategory(
          syncData.answers
            .filter(
              (answer) => answer.questionCategoryId === questionCategoryId,
            )
            .sort((a, b) => b.ts - a.ts),
        );
      }
    });
  });

  // The in-flight delete write, so undo can sequence behind it (below).
  let pendingRemove: Promise<boolean> = Promise.resolve(true);

  const removeAnswerI = (answerId: string) => {
    const removed = getAnswersForCategory().find(
      (a: Answer) => a.id === answerId,
    );
    setAnswersForCategory(
      getAnswersForCategory().filter((a: Answer) => a.id !== answerId),
    );
    setRemovedAnswer(removed ?? null);
    pendingRemove = removeAnswer(answerId).then(
      () => true,
      () => false,
    );
  };

  const undoRemove = () => {
    const removed = getRemovedAnswer();
    if (!removed) return;
    setRemovedAnswer(null);
    setAnswersForCategory(
      [...getAnswersForCategory(), removed].sort((a, b) => b.ts - a.ts),
    );
    // saveAnswer is a plain append, so the re-append must land strictly after
    // the delete's write — unsequenced, an interleaving could duplicate the
    // answer or silently drop the restore. And if the delete itself failed,
    // the answer never left storage, so appending again would duplicate it.
    pendingRemove.then((didRemove) => {
      if (didRemove) saveAnswer(removed);
    });
  };

  const editAnswer = (answerToUpdate: Answer) => {
    setAnswersForCategory(
      getAnswersForCategory().map((aI: Answer) =>
        aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
      ),
    );
    updateAnswer(answerToUpdate);
  };

  const addAnswerI = (answerToAdd: Answer) => {
    const answerWithNewTs = {
      ...answerToAdd,
      ts: Date.now(),
      title: answerToAdd.val.toString().trim(),
    };
    setAnswersForCategory([...getAnswersForCategory(), answerToAdd]);
    saveAnswer(answerWithNewTs).catch((e: unknown) => {
      // Roll the optimistic add back so the list never shows an answer that
      // isn't actually stored (the data layer already alerted the user).
      console.error("Answer save failed — removing it from the list", e);
      setAnswersForCategory(
        getAnswersForCategory().filter((a: Answer) => a.id !== answerToAdd.id),
      );
    });
  };

  // TODO maybe remove click handler for title
  return (
    <div
      classList={{
        [styles.QuestionCategoryView]: true,
        ["pageWrapper"]: true,
        ["mw"]: true,
      }}
    >
      <div
        classList={{
          [styles.categoryTitle]: true,
          ["h2"]: true,
        }}
      >
        {QUESTION_CATEGORY.dashboardTxt}
      </div>

      {isAnswerListCategory() && (
        <div class={styles.answers}>
          {/*<div class="h3">Your Answers</div>*/}
          <AnswerListEditable
            isShowAdd={true}
            questionCategoryId={questionCategoryId}
            answers={getAnswersForCategory()}
            onEdit={editAnswer}
            onRemove={removeAnswerI}
            onAdd={addAnswerI}
          />

          <Show when={getRemovedAnswer()}>
            <div class={styles.removedStatus} aria-live="polite">
              <span>Answer removed.</span>
              <button
                type="button"
                class={styles.undoButton}
                onClick={undoRemove}
              >
                Undo
              </button>
            </div>
          </Show>
        </div>
      )}

      <div class={" " + styles.infoTxt}>
        <div class="h3">Why this can help</div>
        {/*<Ico name="info" size={24} />*/}
        <p class="txt">
          {QUESTION_CATEGORY_ADDITIONAL_INFO[questionCategoryId]}
        </p>
      </div>
    </div>
  );
};

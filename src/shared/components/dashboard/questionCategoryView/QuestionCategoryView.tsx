import { createSignal, JSX, onMount } from "solid-js";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
} from "@src/shared/data/questions";
// @ts-ignore
import styles from "@src/shared/components/dashboard/questionCategoryView/QuestionCategoryView.module.scss";
import { AnswerListForQuestionCategoryView } from "@src/shared/components/dashboard/questionCategoryView/AnswerListForQuestionCategoryView";
import {
  getSyncData,
  removeAnswer,
  updateAnswer,
} from "@src/shared/data/dataInterface";
import { Answer } from "@src/shared/data/sync-data";

export const QuestionCategoryView: (props: {
  questionCategoryId: QuestionCategoryId;
  onLeave: () => void;
}) => JSX.Element = (props) => {
  const [getAnswersForCategory, setAnswersForCategory] = createSignal([]);
  const QUESTION_CATEGORY = QUESTION_CATEGORIES[props.questionCategoryId];

  onMount(() => {
    getSyncData().then((syncData) => {
      if (syncData.answers?.length) {
        setAnswersForCategory(
          syncData.answers
            .filter(
              (answer) =>
                answer.questionCategoryId === props.questionCategoryId,
            )
            .sort((a, b) => b.ts - a.ts),
        );
      }
    });
  });

  const removeAnswerI = (answerId: string) => {
    setAnswersForCategory(
      getAnswersForCategory().filter((a) => a.id !== answerId),
    );
    removeAnswer(answerId);
  };

  const editAnswer = (answerToUpdate: Answer) => {
    setAnswersForCategory(
      getAnswersForCategory().map((aI) =>
        aI.id === answerToUpdate.id ? { ...aI, ...answerToUpdate } : aI,
      ),
    );
    updateAnswer(answerToUpdate);
  };

  return (
    <div class={styles.QuestionCategoryView}>
      <div class={styles.categoryTitle} onClick={props.onLeave}>
        {QUESTION_CATEGORY.dashboardTxt}
      </div>
      <div class={styles.answers}>
        <AnswerListForQuestionCategoryView
          answers={getAnswersForCategory()}
          onEdit={editAnswer}
          onRemove={removeAnswerI}
        />
      </div>
    </div>
  );
};

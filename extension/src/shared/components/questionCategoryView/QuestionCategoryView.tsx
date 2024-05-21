import { createSignal, JSX, onMount } from "solid-js";
import {
  QUESTION_CATEGORIES,
  QuestionCategoryId,
} from "@src/shared/data/questions";
// @ts-ignore
import styles from "@src/shared/components/questionCategoryView/QuestionCategoryView.module.scss";
import { AnswerListEditable } from "@src/shared/components/questionCategoryView/AnswerListEditable";
import {
  getSyncData,
  removeAnswer,
  saveAnswer,
  updateAnswer,
  // @ts-ignore
} from "@dataInterface/syncDataInterface";
import { Answer } from "@src/dataInterface/syncData";
import { Location, Params } from "@solidjs/router/dist/types";
import { useNavigate } from "@solidjs/router";

export const QuestionCategoryView: (props: {
  params: Params;
  location: Location;
  children?: JSX.Element;
  // questionCategoryId: QuestionCategoryId;
  // onLeave: () => void;
}) => JSX.Element = (props) => {
  const [getAnswersForCategory, setAnswersForCategory] = createSignal([]);
  const navigate = useNavigate();
  const questionCategoryId = props.params
    .questionCategoryId as QuestionCategoryId;

  if (!Object.values(QuestionCategoryId).includes(questionCategoryId)) {
    console.error("illegal route param");
  }

  const QUESTION_CATEGORY = QUESTION_CATEGORIES[questionCategoryId];

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

  const addAnswerI = (answerToAdd: Answer) => {
    const answerWithNewTs = {
      ...answerToAdd,
      ts: Date.now(),
      title: answerToAdd.val.toString().trim(),
    };
    setAnswersForCategory([...getAnswersForCategory(), answerToAdd]);
    saveAnswer(answerWithNewTs);
  };

  const goBackToDashboard = () => {
    navigate("/");
  };

  // TODO maybe remove click handler for title
  return (
    <div class={styles.QuestionCategoryView}>
      <div class={styles.categoryTitle} onClick={goBackToDashboard}>
        {QUESTION_CATEGORY.dashboardTxt}
      </div>
      <div class={styles.answers}>
        <AnswerListEditable
          isShowAdd={true}
          questionCategoryId={questionCategoryId}
          answers={getAnswersForCategory()}
          onEdit={editAnswer}
          onRemove={removeAnswerI}
          onAdd={addAnswerI}
          onBack={goBackToDashboard}
        />
      </div>
    </div>
  );
};

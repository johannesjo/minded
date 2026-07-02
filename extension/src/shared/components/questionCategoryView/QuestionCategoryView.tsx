import { createSignal, JSX, onMount } from "solid-js";
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
  const questionCategoryId = props.params
    .questionCategoryId as QuestionCategoryId;

  if (!Object.values(QuestionCategoryId).includes(questionCategoryId)) {
    console.error("illegal route param");
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

  const removeAnswerI = (answerId: string) => {
    setAnswersForCategory(
      getAnswersForCategory().filter((a: Answer) => a.id !== answerId),
    );
    removeAnswer(answerId);
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
    saveAnswer(answerWithNewTs);
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
        </div>
      )}

      <div class={" " + styles.infoTxt}>
        <div class="h3">Why should I care?</div>
        {/*<Ico name="info" size={24} />*/}
        <p class="txt">
          {QUESTION_CATEGORY_ADDITIONAL_INFO[questionCategoryId]}
        </p>
      </div>
    </div>
  );
};

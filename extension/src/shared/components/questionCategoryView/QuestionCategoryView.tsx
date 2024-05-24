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
} from "@src/dataInterface/commonSyncDataInterface";
import { Answer } from "@src/dataInterface/syncData";
import { Location, Params } from "@solidjs/router/dist/types";
import { useNavigate } from "@solidjs/router";
import { QUESTION_CATEGORY_ADDITIONAL_INFO } from "@src/shared/data/questionCategoryAdditional.const";
import { Ico } from "@src/shared/components/ui/Ico";

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

      {QUESTION_CATEGORY.questions?.length && (
        <div class={styles.answers}>
          <div class="h3">Questions and Answers</div>
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

      <div class={"card " + styles.infoTxt}>
        <div class="h3">Why should I care?</div>
        <p>{QUESTION_CATEGORY_ADDITIONAL_INFO[questionCategoryId]}</p>
      </div>

      <button class="btnTxt" onClick={() => goBackToDashboard()}>
        <Ico name="arrowBack" /> Back
      </button>
    </div>
  );
};

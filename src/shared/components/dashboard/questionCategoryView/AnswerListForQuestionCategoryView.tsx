import { JSX } from "solid-js";
// @ts-ignore
import styles from "./AnswerListForQuestionCategoryView.module.scss";
import { Answer } from "@src/shared/data/sync-data";

const MAX_ANSWER_LENGTH = 200;

export const AnswerListForQuestionCategoryView: (props: {
  answers: Answer[];
}) => JSX.Element = (props) => {
  return (
    <div class={styles.AnswerList}>
      {props.answers.map((answer) => (
        <div class={styles.answer}>
          <div
            class={styles.userQuote}
            title={
              "Click to edit! Created on " +
              new Date(answer.ts).toLocaleDateString() +
              " – " +
              new Date(answer.ts).toLocaleTimeString()
            }
          >
            {answer.val.toString()}
          </div>
          {/*<div class={styles.date}>*/}
          {/*  {new Date(answer.ts).toLocaleDateString()}*/}
          {/*  {" / "}*/}
          {/*  {new Date(answer.ts).toLocaleTimeString()}*/}
          {/*</div>*/}
        </div>
      ))}
    </div>
  );
};

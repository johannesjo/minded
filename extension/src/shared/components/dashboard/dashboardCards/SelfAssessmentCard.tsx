import { For, JSX } from "solid-js";
// @ts-ignore
import styles from "./SelfAssessmentCard.module.scss";
import { SelfAssessmentEntry } from "@src/dataInterface/syncData";
import {
  SELF_ASSESSMENT_ANSWERS,
  SELF_ASSESSMENT_QUESTIONS,
  SelfAssessmentId,
} from "@src/shared/components/interaction/selfAssessmentInteraction/selfAssessment.model";

export interface SelfAssessmentEntryForDashboard extends SelfAssessmentEntry {
  selfAssessmentId: SelfAssessmentId;
}

export const SelfAssessmentCard = (props: {
  selfAssessmentEntries: SelfAssessmentEntryForDashboard[];
  isHideHeading?: boolean;
}): JSX.Element => {
  return (
    <div>
      {!props.isHideHeading && <div class="dashboardHeading">recently...</div>}
      <div class="dashboardContent">
        <div style={{ display: "inline-block" }}>
          <table>
            <For each={props.selfAssessmentEntries}>
              {(entry) => {
                const q = SELF_ASSESSMENT_QUESTIONS.find(
                  (q) => q.id === entry.selfAssessmentId,
                );
                return (
                  <tr
                    class={styles.selfReflectionQuestion}
                    title={
                      ((SELF_ASSESSMENT_ANSWERS.find(
                        (answ) => answ.val === entry.val,
                      )?.txt as string) || "") +
                      " – " +
                      new Date(entry.ts).toLocaleDateString() +
                      " " +
                      new Date(entry.ts).toLocaleTimeString()
                    }
                  >
                    <td>
                      <div>{q?.question}</div>
                    </td>
                    <td>
                      <div class={styles.answerTxt}>
                        {
                          SELF_ASSESSMENT_ANSWERS.find(
                            (answ) => answ.val === entry.val,
                          )?.txt
                        }
                      </div>
                    </td>
                  </tr>
                );
              }}
            </For>
          </table>
        </div>
      </div>
    </div>
  );
};

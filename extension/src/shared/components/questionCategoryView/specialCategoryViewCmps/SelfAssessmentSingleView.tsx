import { JSX } from "solid-js";
// @ts-ignore
import styles from "./SelfAssessmentSingleView.module.scss";
import { getRecentSelfAssessmentEntries } from "@src/shared/components/dashboard/getRecentSelfAssementEntries";
import { SyncData } from "@src/dataInterface/syncData";
import { SelfAssessmentCard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";

export const SelfAssessmentSingleView = (props: {
  syncData: SyncData;
}): JSX.Element => {
  return (
    <div class={styles.selfAssessmentSingleView}>
      <SelfAssessmentCard
        isHideHeading={true}
        selfAssessmentEntries={getRecentSelfAssessmentEntries(
          props.syncData.selfAssessment,
        )}
      />
    </div>
  );
};

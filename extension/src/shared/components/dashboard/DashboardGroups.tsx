import { createSignal, For, JSX, onCleanup, onMount } from "solid-js";
import {
  DashboardGroup,
  DashboardGroupAppUsageHappiness,
  DashboardGroupBrowsingBehaviorHappiness,
  DashboardGroupEnergyLvl,
  DashboardGroupMood,
  DashboardGroupSelAssessment,
  DashboardGroupStats,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import { getSyncData } from "@src/dataInterface/commonSyncDataInterface";
import { getDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
// @ts-expect-error
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/dashboardCards/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import { DashboardAnswerList } from "@src/shared/components/dashboard/DashboardAnswerList";
import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import Chart from "@src/shared/components/ui/Chart";
import { getAppUsageOrBrowsingBehaviorChartData } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/getAppUsageOrBrowsingBehaviorChartData";
// @ts-expect-error
import { IS_ANDROID } from "@dataInterface/isAndroid";
import { updateDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/updateDashboardEntries";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { SelfAssessmentCard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (question: QuestionCategoryId) => void;
}) => JSX.Element = (props) => {
  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);

  const refresh = () => {
    console.log("REFRESH DASHBOARD");
    getSyncData().then((syncData) => {
      const existingDashboardGroups = getDashboardGroups();
      if (existingDashboardGroups) {
        const upd = updateDashboardEntriesFromQuestions(
          syncData,
          existingDashboardGroups,
        );
        setDashboardGroups(upd);
      } else {
        const entries = getDashboardEntriesFromQuestions(syncData);
        setDashboardGroups(entries);
      }
    });
  };

  onMount(() => {
    refresh();
    window.addEventListener(REFRESH_DASHBOARD_EV, refresh);
  });

  onCleanup(() => {
    window.removeEventListener(REFRESH_DASHBOARD_EV, refresh);
  });

  return (
    <div
      nr-of-items={getDashboardGroups().length}
      class={styles.DashboardGroups}
    >
      {/* TODO refactor */}
      {/* eslint-disable-next-line solid/prefer-for */}

      <For each={getDashboardGroups()}>
        {(dg) => (
          <div
            onClick={() => "id" in dg && props.onQuestionCategorySelect(dg.id)}
            classList={{
              ["cardDashboard"]: true,
              [styles.box]: true,
              [styles.interactive]: "id" in dg,
              [styles.centerItem]:
                dg.type !== DashboardGroupType.TxtQuestion &&
                dg.type !== DashboardGroupType.BrowsingBehaviorRating &&
                dg.type !== DashboardGroupType.SelfAssessment,
            }}
          >
            {(() => {
              switch (dg.type) {
                case DashboardGroupType.AppUsageRating:
                case DashboardGroupType.BrowsingBehaviorRating:
                  // eslint-disable-next-line no-case-declarations
                  const rd = (
                    dg as
                      | DashboardGroupBrowsingBehaviorHappiness
                      | DashboardGroupAppUsageHappiness
                  ).data;
                  return (
                    <div class={styles.browsingBehaviorGraph}>
                      <div class="dashboardHeading">
                        {IS_ANDROID
                          ? "bad app usage rating over time"
                          : "browsing behavior over time"}
                      </div>
                      <Chart
                        chartData={getAppUsageOrBrowsingBehaviorChartData(rd)}
                      />
                    </div>
                  );
                case DashboardGroupType.Stats:
                  // eslint-disable-next-line no-case-declarations
                  const dgs = dg as DashboardGroupStats;
                  return (
                    <div class={styles.stats}>
                      <div
                        class="dashboardHeading"
                        title="'minded' decisions are counted every time when you leave a website by clicking the sun."
                      >
                        minded decisions today
                      </div>
                      <div
                        class="fatTxt"
                        title={
                          dgs.attempts +
                          " website visit attempts today in total"
                        }
                      >
                        {dgs.sunTaps}
                      </div>
                    </div>
                  );
                case DashboardGroupType.MoodCheckin:
                  // eslint-disable-next-line no-case-declarations
                  const dgm = dg as DashboardGroupMood;
                  return (
                    <div class={styles.moodCheckinWidget}>
                      <div class="dashboardHeading">
                        you feel <span class="fatTxt">{dgm.mood}</span> today!
                      </div>
                      <div class="dashboardContent">
                        {dgm.additionalTxt}
                        {!dgm.additionalTxt &&
                          (dgm.mood === MoodCheckinVal.Awful ||
                            dgm.mood === MoodCheckinVal.Bad) &&
                          "Be very kind to yourself!"}
                      </div>
                    </div>
                  );
                case DashboardGroupType.Quote:
                  return <RndQuote />;

                case DashboardGroupType.SelfAssessment:
                  // eslint-disable-next-line no-case-declarations
                  const dgSA = dg as DashboardGroupSelAssessment;
                  return (
                    <SelfAssessmentCard selfAssessmentEntries={dgSA.entries} />
                  );

                case DashboardGroupType.EnergyLvl:
                  // eslint-disable-next-line no-case-declarations
                  const dge = dg as DashboardGroupEnergyLvl;
                  return (
                    <div class={styles.energyLvl}>
                      <div class="dashboardHeading">
                        your energy level today
                      </div>
                      <Rating isShowOnly={true} value={dge.energyLvl} />
                    </div>
                  );

                default:
                  return <DashboardAnswerList dashboardGroup={dg} />;
              }
            })()}
          </div>
        )}
      </For>
    </div>
  );
};

import { createSignal, For, JSX, onCleanup, onMount } from "solid-js";
import {
  DashboardGroup,
  DashboardGroupAppUsageHappiness,
  DashboardGroupBrowsingBehaviorHappiness,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
  DashboardGroupMood,
  DashboardGroupSelAssessment,
  DashboardGroupStats,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import {
  getSyncData,
  setDailyQuestionsDoneForToday,
} from "@src/dataInterface/commonSyncDataInterface";
import { getDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/dashboardCards/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import Btn from "@src/shared/components/ui/Btn";
import { DashboardAnswerList } from "@src/shared/components/dashboard/DashboardAnswerList";
import { MoodCheckinVal } from "@src/shared/components/interaction/moodCheckin/moodCheckin.const";
import Chart from "@src/shared/components/ui/Chart";
import { getAppUsageOrBrowsingBehaviorChartData } from "@src/shared/components/interaction/appUsageOrBrowsingBehavior/getAppUsageOrBrowsingBehaviorChartData";
import { IS_ANDROID } from "@src/dataInterface/commonSyncDataInterface";
import { updateDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/updateDashboardEntries";
import {
  ON_SHOW_INTERACTION_OVERLAY_EV,
  REFRESH_DASHBOARD_EV,
} from "@src/ev.const";
import { SelfAssessmentCard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";
import { useNavigate } from "@solidjs/router";
import {
  getDailyQuestionsMode,
  isShowDailyQuestionsBanner,
} from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";

const SS_KEY = "dashboardGroupShown";

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (categoryId: QuestionCategoryId) => void;
}) => JSX.Element = (props) => {
  let t0: NodeJS.Timeout | undefined;
  const [getIsAnimateEntrance, setIsAnimateEntrance] =
    createSignal<boolean>(true);

  const [getIsShowDailyQuestionsBanner, setIsShowDailyQuestionsBanner] =
    createSignal<boolean>(false);

  const [
    getIsDailyQuestionsBannerBeingRemoved,
    setIsDailyQuestionsBannerBeingRemoved,
  ] = createSignal<boolean>(false);

  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  const navigate = useNavigate();

  const refresh = () => {
    getSyncData().then((syncData) => {
      setIsShowDailyQuestionsBanner(isShowDailyQuestionsBanner(syncData));

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

  const unsetIsAnimateEntrance = () => {
    setIsAnimateEntrance(false);
  };

  onMount(() => {
    setIsAnimateEntrance(!sessionStorage.getItem(SS_KEY));
    sessionStorage.setItem(SS_KEY, Date.now().toString());

    refresh();
    window.addEventListener(REFRESH_DASHBOARD_EV, refresh);
    window.addEventListener(
      ON_SHOW_INTERACTION_OVERLAY_EV,
      unsetIsAnimateEntrance,
    );
  });

  onCleanup(() => {
    window.removeEventListener(REFRESH_DASHBOARD_EV, refresh);
    window.removeEventListener(
      ON_SHOW_INTERACTION_OVERLAY_EV,
      unsetIsAnimateEntrance,
    );
    window.clearTimeout(t0);
  });

  const removeDailyQuestionsBanner = () => {
    setIsDailyQuestionsBannerBeingRemoved(true);
    setDailyQuestionsDoneForToday(getDailyQuestionsMode());
    window.clearTimeout(t0);
    t0 = setTimeout(() => {
      setIsShowDailyQuestionsBanner(false);
    }, 300);
  };

  return (
    <div
      nr-of-items={getDashboardGroups().length}
      classList={{
        [styles.DashboardGroups]: true,
        [styles.animateCenterEntry]: getIsAnimateEntrance(),
      }}
    >
      {getIsShowDailyQuestionsBanner() && (
        <div
          classList={{
            ["cardDashboard"]: true,
            [styles.box]: true,
            [styles.centerItem]: true,
            [styles.cardDailyQuestions]: true,
            [styles.isBeingRemoved]: getIsDailyQuestionsBannerBeingRemoved(),
          }}
        >
          <div class="txtSlightlyBigger">
            {getDailyQuestionsMode() === "Morning"
              ? "Would you like some inspiration for your day?"
              : "Would you like to reflect on your day?"}
          </div>
          <div class={styles.cardDailyQuestionsBtns}>
            <Btn outline onClick={() => navigate("/dailyQuestions")}>
              let's go
            </Btn>
            <Btn outline onClick={() => removeDailyQuestionsBanner()}>
              no
            </Btn>
          </div>
        </div>
      )}

      <For each={getDashboardGroups()}>
        {(dg) => {
          const isInteractive =
            "id" in dg || dg.type === DashboardGroupType.SleepWindDown;
          const activate = () => {
            if (dg.type === DashboardGroupType.SleepWindDown) {
              navigate("/sleepWindDown");
              return;
            }
            if ("id" in dg) props.onQuestionCategorySelect?.(dg.id);
          };
          return (
            <div
              onClick={activate}
              role={isInteractive ? "button" : undefined}
              tabindex={isInteractive ? 0 : undefined}
              onKeyDown={
                isInteractive
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activate();
                      }
                    }
                  : undefined
              }
              classList={{
                ["cardDashboard"]: true,
                [styles.box]: true,
                [styles.interactive]: isInteractive,
                [styles.centerItem]:
                  dg.type !== DashboardGroupType.TxtQuestion &&
                  dg.type !== DashboardGroupType.BrowsingBehaviorRating &&
                  dg.type !== DashboardGroupType.SelfAssessment,
              }}
            >
              {(() => {
                switch (dg.type) {
                  case DashboardGroupType.SleepWindDown:
                    return (
                      <div>
                        <div class="dashboardHeading">wind down for sleep</div>
                        <div class="fatTxt">it's getting late</div>
                      </div>
                    );
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
                    // eslint-disable-next-line no-case-declarations
                    const additionalTxt =
                      dgm.additionalTxt === "null" ? null : dgm.additionalTxt;
                    return (
                      <div class={styles.moodCheckinWidget}>
                        <div class="dashboardHeading">
                          you feel <span class="fatTxt">{dgm.mood}</span> today!
                        </div>
                        <div class="dashboardContent">
                          {additionalTxt}
                          {!additionalTxt &&
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
                      <SelfAssessmentCard
                        selfAssessmentEntries={dgSA.entries}
                      />
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

                  case DashboardGroupType.EmotionLabeling:
                    // eslint-disable-next-line no-case-declarations
                    const dgEl = dg as DashboardGroupEmotionLabeling;
                    return (
                      <div>
                        <div class="dashboardHeading">your emotions today</div>
                        <div class="dashboardContent">
                          {dgEl.emotions.join(", ")}
                        </div>
                      </div>
                    );

                  default:
                    return <DashboardAnswerList dashboardGroup={dg} />;
                }
              })()}
            </div>
          );
        }}
      </For>
    </div>
  );
};

import {
  createMemo,
  createSignal,
  For,
  JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import {
  DashboardGroup,
  DashboardGroupEmotionLabeling,
  DashboardGroupEnergyLvl,
  DashboardGroupSelAssessment,
  DashboardGroupStats,
  DashboardGroupType,
} from "@src/shared/components/dashboard/dashboard.model";
import {
  getSyncData,
  setDailyQuestionsDoneForToday,
} from "@src/dataInterface/commonSyncDataInterface";
import {
  CENTER_INDEX,
  getDashboardEntriesFromQuestions,
} from "@src/shared/components/dashboard/getDashboardEntriesFromQuestions";
import styles from "@src/shared/components/dashboard/DashboardGroups.module.scss";
import { RndQuote } from "@src/shared/components/dashboard/dashboardCards/RndQuote";
import { QuestionCategoryId } from "@src/shared/data/questions";
import Rating from "@src/shared/components/ui/Rating";
import Btn from "@src/shared/components/ui/Btn";
import { DashboardAnswerList } from "@src/shared/components/dashboard/DashboardAnswerList";
import { updateDashboardEntriesFromQuestions } from "@src/shared/components/dashboard/updateDashboardEntries";
import { REFRESH_DASHBOARD_EV } from "@src/ev.const";
import { SelfAssessmentCard } from "@src/shared/components/dashboard/dashboardCards/SelfAssessmentCard";
import { useNavigate } from "@solidjs/router";
import {
  getDailyQuestionsMode,
  isShowDailyQuestionsBanner,
} from "@src/shared/components/dailyQuestions/getDailyQuestionsMode";
import { navigateWithPageFadeOut } from "@src/util/animation";

// Matches the --dur-soft fade on the collapsed view so it finishes fading out
// before the full set mounts (mirrors the daily-questions banner dismissal).
const REVEAL_FADE_MS = 480;

export const DashboardGroups: (props: {
  onQuestionCategorySelect?: (categoryId: QuestionCategoryId) => void;
  // When true (the /lookBack route) the full grid renders directly, skipping the
  // calm greeting. "show all" routes here so the view is a real, back-able page.
  forceRevealed?: boolean;
}) => JSX.Element = (props) => {
  let t0: NodeJS.Timeout | undefined;
  let revealT0: NodeJS.Timeout | undefined;

  const [getIsShowDailyQuestionsBanner, setIsShowDailyQuestionsBanner] =
    createSignal<boolean>(false);

  const [
    getIsDailyQuestionsBannerBeingRemoved,
    setIsDailyQuestionsBannerBeingRemoved,
  ] = createSignal<boolean>(false);

  // Arrival is calm: a single greeting card (the centre pick — a random
  // reflection, or the quote when there's little to show) instead of the full
  // wall of cards. The rest stay tucked away until you choose to "look back",
  // which routes to the full grid (the /lookBack page) rather than toggling an
  // internal flag — so the grid is a real, back-able view. `isRevealing` just
  // drives the greeting's soft fade-out before that navigation.
  const [getIsRevealing, setIsRevealing] = createSignal<boolean>(false);

  const [getDashboardGroups, setDashboardGroups] = createSignal<
    DashboardGroup[]
  >([]);
  const navigate = useNavigate();

  // The greeting card: the centre pick sits at CENTER_INDEX once there are
  // enough cards, and the fallback quote (spliced in last) when there are fewer.
  const getHeroIndex = createMemo(() => {
    const len = getDashboardGroups().length;
    return len > CENTER_INDEX ? CENTER_INDEX : len - 1;
  });
  const getHeroGroup = createMemo(() => getDashboardGroups()[getHeroIndex()]);

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

  onMount(() => {
    refresh();
    window.addEventListener(REFRESH_DASHBOARD_EV, refresh);
  });

  onCleanup(() => {
    window.removeEventListener(REFRESH_DASHBOARD_EV, refresh);
    window.clearTimeout(t0);
    window.clearTimeout(revealT0);
  });

  // Fade the calm greeting out, then route to the full "look back" grid so it
  // eases over rather than hard-cutting (see the "transitions — always soft"
  // styling rule). Routing (not an internal flag) makes it a real page: the
  // global bottom bar shows its back arrow there, exactly like settings.
  const revealAll = () => {
    setIsRevealing(true);
    window.clearTimeout(revealT0);
    revealT0 = setTimeout(() => navigate("/lookBack"), REVEAL_FADE_MS);
  };

  const removeDailyQuestionsBanner = () => {
    setIsDailyQuestionsBannerBeingRemoved(true);
    setDailyQuestionsDoneForToday(getDailyQuestionsMode());
    window.clearTimeout(t0);
    // Matches the --dur-soft fade-out on .isBeingRemoved so the node stays
    // mounted for the full fade instead of being pulled out mid-transition.
    t0 = setTimeout(() => {
      setIsShowDailyQuestionsBanner(false);
    }, 480);
  };

  const renderDailyQuestionsBanner = () => (
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
        <Btn
          outline
          onClick={() => navigateWithPageFadeOut(navigate, "/dailyQuestions")}
        >
          let's go
        </Btn>
        <Btn outline onClick={() => removeDailyQuestionsBanner()}>
          no
        </Btn>
      </div>
    </div>
  );

  const renderCard = (dg: DashboardGroup) => {
    const isInteractive =
      "id" in dg || dg.type === DashboardGroupType.SleepWindDown;
    const activate = () => {
      if (dg.type === DashboardGroupType.SleepWindDown) {
        navigateWithPageFadeOut(navigate, "/sleepWindDown");
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
                      dgs.attempts + " website visit attempts today in total"
                    }
                  >
                    {dgs.sunTaps}
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
                  <div class="dashboardHeading">your energy level today</div>
                  <Rating isShowOnly={true} value={dge.energyLvl} />
                </div>
              );

            case DashboardGroupType.EmotionLabeling:
              // eslint-disable-next-line no-case-declarations
              const dgEl = dg as DashboardGroupEmotionLabeling;
              return (
                <div>
                  <div class="dashboardHeading">your emotions today</div>
                  <div class="dashboardContent">{dgEl.emotions.join(", ")}</div>
                </div>
              );

            default:
              return <DashboardAnswerList dashboardGroup={dg} />;
          }
        })()}
      </div>
    );
  };

  return (
    <Show
      when={props.forceRevealed}
      fallback={
        <div
          classList={{
            [styles.collapsed]: true,
            [styles.isRevealing]: getIsRevealing(),
          }}
        >
          <Show
            when={getIsShowDailyQuestionsBanner()}
            fallback={
              <Show when={getHeroGroup()}>{(g) => renderCard(g())}</Show>
            }
          >
            {renderDailyQuestionsBanner()}
          </Show>

          <Show when={getDashboardGroups().length > 1}>
            <Btn outline class={styles.revealBtn} onClick={revealAll}>
              show all
            </Btn>
          </Show>
        </div>
      }
    >
      <div class={styles.DashboardGroups}>
        <For each={getDashboardGroups()}>{(dg) => renderCard(dg)}</For>
      </div>
    </Show>
  );
};

/* @refresh reload */
import {
  createSignal,
  JSX,
  onCleanup,
  onMount,
  Show,
  Switch,
  Match,
} from "solid-js";
import { fadeOut } from "@src/util/animation";
import { stopAllVideos } from "@src/util/stopAllVideos";
import { LittleSunComponent } from "@src/shared/components/interaction/LittleSun";
import InteractionCommon from "@src/shared/components/interaction/InteractionCommon";
import { closeTab } from "@src/dataInterface/extension/extensionApi";
import { QuestionForPrompt } from "@src/shared/data/questions";
import { IS_MOUSE_PRIMARY } from "@src/util/touch";
import { isDarkModeNow } from "@src/shared/addWrapperClasses";
import { updateHostsEntry } from "@dataInterface/localDataInterface";
import {
  updateSyncData,
  getSyncData,
  countSunTap,
} from "@src/dataInterface/commonSyncDataInterface";
import { shouldPromptBudgetSetup, getBudgetState } from "@src/util/budget";
import { BudgetSetupPrompt } from "@src/shared/components/interaction/budgetSetup/BudgetSetupPrompt";
import { BudgetExhaustedMessage } from "@src/shared/components/interaction/BudgetExhaustedMessage";
import { DailyBudget } from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";

// NOTE: val also needs to be set in css

export const InteractionWeb: (props: {
  host: string;
  onHideAll: () => void;
  shadowRoot?: ShadowRoot;
}) => JSX.Element = (props) => {
  // const [getMode, setMode] = createSignal<InteractionMode | undefined>();
  const [getWasAnswerGiven, setWasAnswerGiven] = createSignal(false);
  const [getQuestion, setQuestion] = createSignal<QuestionForPrompt>();

  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getIsShowBlackScreen, setIsShowBlackScreen] = createSignal(false);
  const [getIsShowBudgetPrompt, setIsShowBudgetPrompt] = createSignal(false);
  const [getIsShowBudgetExhausted, setIsShowBudgetExhausted] =
    createSignal(false);
  const [getCurrentSkips, setCurrentSkips] = createSignal(0);

  let wrapperEl: HTMLDivElement = undefined!;

  onMount(async () => {
    // Stop videos multiple times to catch delayed autoplay
    setTimeout(() => stopAllVideos(), 1000);
    setTimeout(() => stopAllVideos(), 2000);
    setTimeout(() => stopAllVideos(), 5000);

    // NOTE: Session checks (activeTimer, sessionEndTS) are intentionally NOT done here.
    // content-script.tsx and isShowFullMinder() already determine whether to show
    // InteractionWeb vs LittleSun before rendering. Re-checking here with async data
    // loads creates a race condition where the state can toggle and cause the
    // intervention to show twice.

    // Check if budget is exhausted - show message briefly
    const syncData = await getSyncData();
    const budgetState = getBudgetState(syncData, props.host);
    if (budgetState.isActive && budgetState.remainingSeconds <= 0) {
      setIsShowBudgetExhausted(true);
    }
  });

  const escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      fadeOut(wrapperEl, 150);
    }
  };

  onMount(() => {
    document.addEventListener("keydown", escapeHandler);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", escapeHandler);
  });

  const teardown = () => {
    console.log("InteractionWeb: teardown called - hiding interaction");
    console.trace("Teardown call stack");
    document.removeEventListener("keydown", escapeHandler);
    props.onHideAll();
  };

  const setSessionLimit = async (seconds: number) => {
    const now = Date.now();
    const isRestOfDay = seconds < 0;
    const endTs = isRestOfDay
      ? (() => {
          const endOfDay = new Date();
          endOfDay.setHours(24, 0, 0, 0);
          return endOfDay.getTime();
        })()
      : now + seconds * 1000;

    await updateSyncData({
      activeTimer: {
        endTS: endTs,
        durationS: seconds,
      },
    });

    await updateHostsEntry(props.host, {
      sessionLimitInS: seconds,
      sessionEndTS: endTs,
      lastUsedTS: now,
      sessionDurationInS: 0,
    });

    // Ensure we tear down any stale question state
    setQuestion(undefined);
    stopAllVideos();

    if (isRestOfDay) {
      // Rest of day: hide everything completely
      teardown();
    } else {
      // Timed session: show little sun countdown
      setIsShowLittleSun(true);
    }
  };

  const handleSetBudget = async (budget: DailyBudget) => {
    await updateSyncData({ dailyBudget: budget });
    setIsShowBudgetPrompt(false);
    // After setting budget, show little sun in budget mode
    setIsShowLittleSun(true);
  };

  const handleDismissBudgetPrompt = async () => {
    await updateSyncData({ budgetPromptDismissedTS: Date.now() });
    setIsShowBudgetPrompt(false);
    setIsShowLittleSun(true);
  };

  return (
    <>
      {/* Use Switch/Match for exclusive conditional rendering to prevent
          component recreation when unrelated signals change */}
      <Switch>
        <Match when={getIsShowBudgetPrompt()}>
          <div class="aniIn" style={{ opacity: "1" }}>
            <div
              id="minded-6622-coloured-wrapper-dynamic"
              class={isDarkModeNow() ? "minded-6622-dark" : ""}
              style={{ opacity: "1" }}
            >
              <BudgetSetupPrompt
                currentSkips={getCurrentSkips()}
                onSetBudget={handleSetBudget}
                onDismiss={handleDismissBudgetPrompt}
              />
            </div>
          </div>
        </Match>
        <Match when={getIsShowLittleSun()}>
          <div class="aniIn" style={{ opacity: "1" }}>
            <LittleSunComponent
              host={props.host}
              teardown={teardown}
              onShowFreshInteraction={() => {
                setIsShowLittleSun(false);
                setQuestion(undefined);
                stopAllVideos();
              }}
              onTap={() => closeTab()}
            />
          </div>
        </Match>
        <Match when={true}>
          <div class="aniIn">
            <div
              id="minded-6622-coloured-wrapper-dynamic"
              class={isDarkModeNow() ? "minded-6622-dark" : ""}
              style={{ opacity: "1" }}
              onclick={(ev) => {
                // Background click disabled - only gesture controls
                ev.stopPropagation();
              }}
              ref={(el) => {
                wrapperEl = el;
                // Reset inline styles when element is (re)created to ensure visibility
                // This fixes the issue where previous opacity manipulation persists
                if (el) {
                  el.style.opacity = "1";
                  el.style.transition = "";
                }
              }}
            >
              <InteractionCommon
                questionForPrompt={getQuestion()}
                isInitFadeout={false}
                wrapperEl={wrapperEl}
                shadowRoot={props.shadowRoot}
                onSetAnswer={() => {}}
                onModeSet={() => {}}
                onAfterInteractionFadeout={() => {
                  setIsShowLittleSun(true);
                }}
                onSkip={async () => {
                  console.log("InteractionWeb: onSkip called");
                  await countSunTap();
                  const syncData = await getSyncData();

                  // Check if we should show budget setup prompt
                  if (shouldPromptBudgetSetup(syncData)) {
                    const today = getIsoDate();
                    setCurrentSkips(syncData.sunTaps[today] || 0);
                    setIsShowBudgetPrompt(true);
                  } else {
                    setIsShowLittleSun(true);
                  }
                }}
                onUpdateQuestion={(question) => {
                  setQuestion(question);
                }}
                onFlingAway={() => {
                  console.log(
                    "InteractionWeb: onFlingAway called, closing tab",
                  );
                  closeTab();
                }}
                onDragComplete={() => {
                  console.log(
                    "InteractionWeb: onDragComplete called, closing tab",
                  );
                  closeTab();
                }}
                onSetSessionLimit={setSessionLimit}
              />
            </div>
          </div>
        </Match>
      </Switch>

      <Show when={getIsShowBlackScreen()}>
        <div id="minded-6622-black-screen"></div>
      </Show>

      <Show when={getIsShowBudgetExhausted()}>
        <BudgetExhaustedMessage
          onComplete={() => setIsShowBudgetExhausted(false)}
        />
      </Show>
    </>
  );
};

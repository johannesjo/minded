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
import {
  ActiveTimer,
  DailyBudget,
  SessionIntent,
} from "@src/dataInterface/syncData";
import { getIsoDate } from "@src/util/getIsoDate";
import { createActiveTimer } from "@src/shared/components/interaction/sessionLimit";

// NOTE: val also needs to be set in css

export const InteractionWeb: (props: {
  host: string;
  onHideAll: () => void;
  shadowRoot?: ShadowRoot;
}) => JSX.Element = (props) => {
  const [getQuestion, setQuestion] = createSignal<QuestionForPrompt>();

  const [getIsShowLittleSun, setIsShowLittleSun] = createSignal(false);
  const [getIsShowBudgetPrompt, setIsShowBudgetPrompt] = createSignal(false);
  const [getIsShowBudgetExhausted, setIsShowBudgetExhausted] =
    createSignal(false);
  const [getCurrentSkips, setCurrentSkips] = createSignal(0);

  let wrapperEl: HTMLDivElement = undefined!;
  let isDisposed = false;
  let isDismissing = false;
  const stopVideoTimeouts: number[] = [];

  onMount(async () => {
    // Stop videos multiple times to catch delayed autoplay
    stopVideoTimeouts.push(
      window.setTimeout(() => stopAllVideos(), 1000),
      window.setTimeout(() => stopAllVideos(), 2000),
      window.setTimeout(() => stopAllVideos(), 5000),
    );

    // NOTE: Session checks (activeTimer, sessionEndTS) are intentionally NOT done here.
    // content-script.tsx and isShowFullMinder() already determine whether to show
    // InteractionWeb vs LittleSun before rendering. Re-checking here with async data
    // loads creates a race condition where the state can toggle and cause the
    // intervention to show twice.

    // Check if budget is exhausted - show message briefly
    const syncData = await getSyncData();
    if (isDisposed) return;

    const budgetState = getBudgetState(syncData, props.host);
    if (budgetState.isActive && budgetState.remainingSeconds <= 0) {
      setIsShowBudgetExhausted(true);
    }
  });

  const escapeHandler: EventListener = (ev) => {
    const keyboardEvent = ev as KeyboardEvent;

    if (keyboardEvent.key === "Escape") {
      ev.stopPropagation();
      ev.preventDefault();
      if (isDismissing) return;

      isDismissing = true;
      if (wrapperEl) {
        fadeOut(wrapperEl, 150).promise.then(() => teardown());
      } else {
        teardown();
      }
    }
  };

  const shadowKeyboardEventTarget = props.shadowRoot;

  onMount(() => {
    // Capture on document so Escape also works while focus is still on the host page.
    document.addEventListener("keydown", escapeHandler, true);
    shadowKeyboardEventTarget?.addEventListener("keydown", escapeHandler);
  });

  onCleanup(() => {
    isDisposed = true;
    stopVideoTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    document.removeEventListener("keydown", escapeHandler, true);
    shadowKeyboardEventTarget?.removeEventListener("keydown", escapeHandler);
  });

  const teardown = () => {
    document.removeEventListener("keydown", escapeHandler, true);
    shadowKeyboardEventTarget?.removeEventListener("keydown", escapeHandler);
    props.onHideAll();
  };

  const setSessionLimit = async (seconds: number, intent?: SessionIntent) => {
    const now = Date.now();
    const isRestOfDay = seconds < 0;
    const activeTimer: ActiveTimer = createActiveTimer({
      seconds,
      now,
      target: { kind: "host", id: props.host },
      platform: "web",
      intent,
    });

    await updateSyncData({ activeTimer });

    await updateHostsEntry(props.host, {
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
                interactionTarget={{ kind: "host", id: props.host }}
                interactionPlatform="web"
                onSetAnswer={() => {}}
                onModeSet={() => {}}
                onAfterInteractionFadeout={() => {
                  setIsShowLittleSun(true);
                }}
                onSkip={async () => {
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
                onFlingAway={() => closeTab()}
                onDragComplete={() => closeTab()}
                onSetSessionLimit={setSessionLimit}
              />
            </div>
          </div>
        </Match>
      </Switch>

      <Show when={getIsShowBudgetExhausted()}>
        <BudgetExhaustedMessage
          onComplete={() => setIsShowBudgetExhausted(false)}
        />
      </Show>
    </>
  );
};

import {
  getSyncData,
  IS_ANDROID,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import BreathingExercise from "@src/shared/components/interaction/breathingExercise/BreathingExercise";
import { MoodCheckin } from "@src/shared/components/interaction/moodCheckin/MoodCheckin";
import Sun from "@src/shared/components/interaction/sun/Sun";
import { Ico } from "@src/shared/components/ui/Ico";
import {
  CALM_READ_PASSAGES,
  GRATITUDE_PROMPTS,
  SLEEP_TIPS,
  TOMORROW_PROMPTS,
} from "@src/shared/data/sleepContent";
import { getIsoDate } from "@src/util/getIsoDate";
import {
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { BrainDump } from "./activities/BrainDump";
import {
  nightIdToIndex,
  resolveNightId,
  SNOOZE_MINUTES,
} from "./sleepWindDown.util";
import type { SleepWindDownActivityKey } from "./sleepWindDownActivityActions";
import { getSleepWindDownActivityAction } from "./sleepWindDownActivityActions";
import {
  shouldBackReturnToWindDownOverview,
  SleepWindDownViewName,
  WIND_DOWN_OVERVIEW_VIEW,
} from "./sleepWindDownBackNavigation";
import type { SleepWindDownDismissReason } from "./sleepWindDownDismissTransition";
import { createSleepWindDownDismissTransition } from "./sleepWindDownDismissTransition";
// @ts-ignore
import styles from "./SleepWindDownRoute.module.scss";

export type { SleepWindDownDismissReason } from "./sleepWindDownDismissTransition";

const SNOOZE_INTENT_OPTIONS = [
  "Something unfinished",
  "My mind won't settle",
  "Worried, I won't sleep",
  "I'm avoiding tomorrow",
  "I feel lonely",
];

type ActivityKey = SleepWindDownActivityKey;

type DraftField =
  | "sleepWindDownBrainDumpDraft"
  | "sleepWindDownGratitudeDraft"
  | "sleepWindDownTomorrowDraft";

const ACTIVITIES: {
  key: ActivityKey;
  label: string;
  view: SleepWindDownViewName;
}[] = [
  { key: "brainDump", label: "Gentle brain dump", view: "brainDump" },
  { key: "gratitude", label: "Gratitude / reflection", view: "gratitude" },
  { key: "tomorrow", label: "Tomorrow's top 3", view: "tomorrow" },
  { key: "mood", label: "Mood check-in", view: "mood" },
  { key: "breathing", label: "Breathing exercise", view: "breathing" },
  { key: "calmRead", label: "Something calm to read", view: "calmRead" },
];

const resolveNightIdFromStorage = async (): Promise<string> => {
  const sd = await getSyncData();
  const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
  return resolveNightId(cfg) ?? getIsoDate();
};

export interface SleepWindDownViewProps {
  /** When true, no state is persisted (used for "Try wind-down now" preview). */
  isPreview?: boolean;
  /**
   * Called after persistence completes. The host decides what "leaving" means
   * — main app navigates to dashboard, Android overlay closes the blocked app.
   */
  onDismiss: (reason: SleepWindDownDismissReason) => void;
}

export const SleepWindDownView = (
  props: SleepWindDownViewProps,
): JSX.Element => {
  const [view, setView] = createSignal<SleepWindDownViewName>("prompt");
  const [completed, setCompleted] = createSignal<Set<ActivityKey>>(new Set());
  const [brainDumpDraft, setBrainDumpDraft] = createSignal("");
  const [gratitudeDraft, setGratitudeDraft] = createSignal("");
  const [tomorrowDraft, setTomorrowDraft] = createSignal("");
  const [hydrated, setHydrated] = createSignal(false);
  // Skip persists its state up front and then routes through the goodnight
  // gesture as a calming exit. We carry the chosen reason here so the moon-
  // drag completion fires onDismiss with the original semantics (skip exits,
  // done locks screen on Android). Snooze bypasses the gesture entirely.
  const [pendingReason, setPendingReason] =
    createSignal<SleepWindDownDismissReason>("done");

  let currentNightId: string | null = null;
  let wrapperEl: HTMLDivElement | undefined;
  let hasOverviewBackCheckpoint = false;
  // Serialize ALL writes through this chain — `updateSyncData` is a full-blob
  // read-modify-write, so concurrent writes silently drop each other's deltas.
  let pendingWritePromise: Promise<void> = Promise.resolve();
  const dismissWithFade = createSleepWindDownDismissTransition({
    getWrapperEl: () => wrapperEl,
    onDismiss: props.onDismiss,
  });

  const pushOverviewBackCheckpoint = () => {
    if (hasOverviewBackCheckpoint) return;
    try {
      window.history.pushState(
        {
          ...(typeof window.history.state === "object" &&
          window.history.state !== null
            ? window.history.state
            : {}),
          mindedSleepWindDownBackToOverview: true,
        },
        "",
        window.location.href,
      );
      hasOverviewBackCheckpoint = true;
    } catch (e) {
      console.warn("Failed to arm sleep wind-down back navigation", e);
    }
  };

  const goToView = (nextView: SleepWindDownViewName) => {
    const currentView = view();
    const isReturningToOverview =
      nextView === WIND_DOWN_OVERVIEW_VIEW &&
      hasOverviewBackCheckpoint &&
      shouldBackReturnToWindDownOverview(currentView);

    if (shouldBackReturnToWindDownOverview(nextView)) {
      pushOverviewBackCheckpoint();
    }

    setView(nextView);

    if (isReturningToOverview) {
      hasOverviewBackCheckpoint = false;
      window.history.back();
    }
  };

  const enqueueWrite = (fn: () => Promise<void>): Promise<void> => {
    const next = pendingWritePromise.catch(() => undefined).then(fn);
    pendingWritePromise = next.catch((e) => {
      console.warn("Failed to persist sleep wind-down state", e);
    });
    return next;
  };

  onMount(() => {
    const handleBrowserBack = () => {
      if (
        hasOverviewBackCheckpoint &&
        shouldBackReturnToWindDownOverview(view())
      ) {
        hasOverviewBackCheckpoint = false;
        setView(WIND_DOWN_OVERVIEW_VIEW);
      }
    };

    window.addEventListener("popstate", handleBrowserBack);
    onCleanup(() => {
      window.removeEventListener("popstate", handleBrowserBack);
    });
  });

  onMount(async () => {
    const sd = await getSyncData();
    const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
    currentNightId = resolveNightId(cfg);
    if (currentNightId && sd.sleepWindDownProgressNightId === currentNightId) {
      setCompleted(new Set(sd.sleepWindDownCompleted as ActivityKey[]));
      setBrainDumpDraft(sd.sleepWindDownBrainDumpDraft ?? "");
      setGratitudeDraft(sd.sleepWindDownGratitudeDraft ?? "");
      setTomorrowDraft(sd.sleepWindDownTomorrowDraft ?? "");
    }
    setHydrated(true);
  });

  const calmReadPassage = (): string => {
    // hydrated() is read so this re-runs once the night id is known; before
    // that it falls back to today's ISO date, which is also stable.
    hydrated();
    const nid = currentNightId ?? getIsoDate();
    return CALM_READ_PASSAGES[nightIdToIndex(nid, CALM_READ_PASSAGES.length)];
  };

  const persistCompleted = (next: Set<ActivityKey>): Promise<void> => {
    if (props.isPreview) return Promise.resolve();
    return enqueueWrite(async () => {
      const nightId = currentNightId ?? (await resolveNightIdFromStorage());
      currentNightId = nightId;
      await updateSyncData({
        sleepWindDownProgressNightId: nightId,
        sleepWindDownCompleted: Array.from(next),
      });
    });
  };

  const markComplete = (key: ActivityKey) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(key);
      persistCompleted(next);
      return next;
    });
  };

  const persistDraft = (field: DraftField, text: string): void => {
    if (props.isPreview) return;
    enqueueWrite(async () => {
      const nightId = currentNightId ?? (await resolveNightIdFromStorage());
      currentNightId = nightId;
      await updateSyncData({
        sleepWindDownProgressNightId: nightId,
        [field]: text,
      } as Partial<SyncData>);
    });
  };

  const completePromptActivity = async (
    key: ActivityKey,
    draftField: DraftField,
    clearLocalDraft: () => void,
  ) => {
    const next = new Set(completed());
    next.add(key);
    setCompleted(next);
    clearLocalDraft();

    if (!props.isPreview) {
      await enqueueWrite(async () => {
        const nightId = currentNightId ?? (await resolveNightIdFromStorage());
        currentNightId = nightId;
        await updateSyncData({
          sleepWindDownProgressNightId: nightId,
          sleepWindDownCompleted: Array.from(next),
          [draftField]: "",
        } as Partial<SyncData>);
      });
    }

    goToView(WIND_DOWN_OVERVIEW_VIEW);
  };

  const completeGoodnight = async () => {
    const reason = pendingReason();
    // Skip already persisted its state when the user clicked it, so the
    // goodnight gesture is just a visual exit there. Only the "done" path
    // (Goodnight from menu) needs the dismiss persistence here.
    if (reason === "done" && !props.isPreview) {
      await enqueueWrite(async () => {
        const nightId = await resolveNightIdFromStorage();
        await updateSyncData({
          sleepWindDownDismissedNightId: nightId,
          sleepWindDownProgressNightId: "",
          sleepWindDownCompleted: [],
          sleepWindDownBrainDumpDraft: "",
          sleepWindDownGratitudeDraft: "",
          sleepWindDownTomorrowDraft: "",
          sleepWindDownSnoozeUntilTS: 0,
        });
      });
    }
    await dismissWithFade(reason);
  };

  const skipTonight = async () => {
    setPendingReason("skip");
    if (!props.isPreview) {
      await enqueueWrite(async () => {
        const nightId = await resolveNightIdFromStorage();
        await updateSyncData({
          sleepWindDownDismissedNightId: nightId,
          sleepWindDownProgressNightId: "",
          sleepWindDownCompleted: [],
          sleepWindDownBrainDumpDraft: "",
          sleepWindDownGratitudeDraft: "",
          sleepWindDownTomorrowDraft: "",
          sleepWindDownSnoozeUntilTS: 0,
        });
      });
    }
    goToView("goodnight");
  };

  const snooze = async () => {
    if (!props.isPreview) {
      await enqueueWrite(async () => {
        await updateSyncData({
          sleepWindDownSnoozeUntilTS: Date.now() + SNOOZE_MINUTES * 60 * 1000,
        });
      });
    }
    // Snooze returns the user to whatever they were doing without the moon-
    // drag gesture. On Android the host turns this deadline into the regular
    // little-sun countdown.
    await dismissWithFade("snooze");
  };

  const enterGoodnight = () => {
    setPendingReason("done");
    goToView("goodnight");
  };

  const activityActions = (activityKey: ActivityKey): JSX.Element => {
    const action = getSleepWindDownActivityAction(activityKey);

    return (
      <div class={styles.activityActions}>
        <button
          class="btnTxtOutline"
          onClick={() => {
            if (action === "complete") {
              markComplete(activityKey);
            }
            goToView(WIND_DOWN_OVERVIEW_VIEW);
          }}
        >
          {action === "complete" ? (
            "Done"
          ) : (
            <>
              <Ico name="arrowBack" /> Back
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div
      ref={(el) => {
        wrapperEl = el;
      }}
      class={`${styles.wrapper} pageTransitionIn`}
    >
      <Show when={view()} keyed>
        {(currentView) => (
          <div class={styles.viewPane}>
            <Switch>
              <Match when={currentView === "prompt"}>
                <div class={styles.center}>
                  <h2 class="h2 h2Mindful">Wind down for sleep?</h2>
                  <p class={styles.subtle}>
                    It's getting late — would you like to take a moment before
                    bed?
                  </p>
                  <div class={styles.btnRow}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => goToView(WIND_DOWN_OVERVIEW_VIEW)}
                      disabled={!hydrated()}
                    >
                      Yes
                    </button>
                    <button
                      class="btnTxtOutline"
                      onClick={() => goToView("snoozeIntent")}
                      disabled={!hydrated()}
                    >
                      Snooze 15 min
                    </button>
                    <button
                      class="btnTxtOutline"
                      onClick={skipTonight}
                      disabled={!hydrated()}
                    >
                      Skip tonight
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "menu"}>
                <div class={styles.menu}>
                  <h2 class="h2 h2Mindful">Choose anything that helps</h2>
                  <p class={styles.subtle}>
                    Pick in any order. Skip what you don't need.
                  </p>
                  <div class={styles.activityList}>
                    <For each={ACTIVITIES}>
                      {(a) => {
                        const isDone = () => completed().has(a.key);
                        return (
                          <button
                            class={`btnToggleSelect ${isDone() ? "isSelected" : ""}`}
                            onClick={() => goToView(a.view)}
                            disabled={!hydrated()}
                          >
                            {isDone() && (
                              <span class={styles.activityCheck}>
                                <Ico name="check" />
                              </span>
                            )}
                            <span>{a.label}</span>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                  <div class={styles.menuFooter}>
                    <button
                      class="btnTxt"
                      onClick={enterGoodnight}
                      disabled={!hydrated()}
                    >
                      {completed().size > 0 ? (
                        <>
                          <Ico name="check" /> All done
                        </>
                      ) : (
                        "Goodnight"
                      )}
                    </button>
                  </div>
                  <button
                    class={styles.tipsLink}
                    onClick={() => goToView("tips")}
                    disabled={!hydrated()}
                  >
                    Tips for good sleep
                  </button>
                </div>
              </Match>

              <Match when={currentView === "brainDump"}>
                <BrainDump
                  initialText={brainDumpDraft()}
                  onDraftChange={(t) => {
                    setBrainDumpDraft(t);
                    persistDraft("sleepWindDownBrainDumpDraft", t);
                  }}
                  onBeforeSubmit={() => pendingWritePromise}
                  onDone={() =>
                    completePromptActivity(
                      "brainDump",
                      "sleepWindDownBrainDumpDraft",
                      () => setBrainDumpDraft(""),
                    )
                  }
                />
              </Match>

              <Match when={currentView === "gratitude"}>
                <BrainDump
                  initialText={gratitudeDraft()}
                  prompts={GRATITUDE_PROMPTS}
                  onDraftChange={(t) => {
                    setGratitudeDraft(t);
                    persistDraft("sleepWindDownGratitudeDraft", t);
                  }}
                  onBeforeSubmit={() => pendingWritePromise}
                  onDone={() =>
                    completePromptActivity(
                      "gratitude",
                      "sleepWindDownGratitudeDraft",
                      () => setGratitudeDraft(""),
                    )
                  }
                />
              </Match>

              <Match when={currentView === "tomorrow"}>
                <BrainDump
                  initialText={tomorrowDraft()}
                  prompts={TOMORROW_PROMPTS}
                  onDraftChange={(t) => {
                    setTomorrowDraft(t);
                    persistDraft("sleepWindDownTomorrowDraft", t);
                  }}
                  onBeforeSubmit={() => pendingWritePromise}
                  onDone={() =>
                    completePromptActivity(
                      "tomorrow",
                      "sleepWindDownTomorrowDraft",
                      () => setTomorrowDraft(""),
                    )
                  }
                />
              </Match>

              <Match when={currentView === "mood"}>
                <div class={styles.activityBody}>
                  <MoodCheckin
                    onSuccess={() => {
                      markComplete("mood");
                      goToView(WIND_DOWN_OVERVIEW_VIEW);
                    }}
                    onSkip={() => undefined}
                    onCancelCountdown={() => undefined}
                  />
                  {activityActions("mood")}
                </div>
              </Match>

              <Match when={currentView === "breathing"}>
                <div class={styles.activityBody}>
                  <BreathingExercise />
                  {activityActions("breathing")}
                </div>
              </Match>

              <Match when={currentView === "calmRead"}>
                <div class={styles.activityBody}>
                  <p class={styles.calmRead}>{calmReadPassage()}</p>
                  {activityActions("calmRead")}
                </div>
              </Match>

              <Match when={currentView === "tips"}>
                <div class={styles.activityBody}>
                  <h2 class={`h2 h2Mindful ${styles.activityTitle}`}>
                    Tips for good sleep
                  </h2>
                  <ul class={styles.tipsList}>
                    <For each={SLEEP_TIPS}>{(tip) => <li>{tip}</li>}</For>
                  </ul>
                  {activityActions("tips")}
                </div>
              </Match>

              <Match when={currentView === "snoozeIntent"}>
                <div class={styles.center}>
                  <h2 class="h2 h2Mindful">What's keeping you up?</h2>
                  <p class={styles.subtle}>
                    A moment of honesty before snoozing.
                  </p>
                  <div class={styles.btnRow}>
                    <For each={SNOOZE_INTENT_OPTIONS}>
                      {(opt) => (
                        <button
                          class="btnToggleSelect"
                          onClick={() => goToView("snoozeGoodnight")}
                          disabled={!hydrated()}
                        >
                          {opt}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "snoozeGoodnight"}>
                <div class={styles.goodnightGesture}>
                  <BackgroundTransition isSunGradientAttached={false} />
                  <div class={styles.goodnightContent}>
                    <h2 class="h2 h2Mindful" style={{ margin: 0 }}>
                      15 more minutes
                    </h2>
                    <p class={styles.subtle}>
                      {IS_ANDROID
                        ? "Triple-tap to snooze, or drag the moon down to sleep now."
                        : "Triple-tap to confirm."}
                    </p>
                    <div class={styles.moonContainer}>
                      <Sun
                        variant="moon"
                        completionDirection="down"
                        isTapEnabled={true}
                        tapThreshold={3}
                        isDragEnabled={IS_ANDROID}
                        onSkip={snooze}
                        onFlingAway={completeGoodnight}
                        onDragComplete={completeGoodnight}
                        onStartBackgroundAnimation={(direction) => {
                          window.dispatchEvent(
                            new CustomEvent("startBackgroundAnimation", {
                              detail: { direction },
                            }),
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "goodnight"}>
                <div class={styles.goodnightGesture}>
                  <BackgroundTransition isSunGradientAttached={false} />
                  <div class={styles.goodnightContent}>
                    <h2 class="h2 h2Mindful" style={{ margin: 0 }}>
                      Sleep well
                    </h2>
                    <p class={styles.subtle}>
                      Drag the moon down to let the day go.
                    </p>
                    <div class={styles.moonContainer}>
                      <Sun
                        variant="moon"
                        completionDirection="down"
                        isTapEnabled={false}
                        onSkip={completeGoodnight}
                        onFlingAway={completeGoodnight}
                        onDragComplete={completeGoodnight}
                        onStartBackgroundAnimation={(direction) => {
                          window.dispatchEvent(
                            new CustomEvent("startBackgroundAnimation", {
                              detail: { direction },
                            }),
                          );
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Match>
            </Switch>
          </div>
        )}
      </Show>
    </div>
  );
};

export default SleepWindDownView;

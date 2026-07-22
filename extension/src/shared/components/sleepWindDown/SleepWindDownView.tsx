/**
 * Sleep wind-down - deliberately Android-only for now (gated at the trigger,
 * settings entry, and dashboard card, not here): the phone in bed is where
 * evening doom-scrolling actually happens, and the feature is still
 * half-experimental, so the extra desktop effort isn't warranted while the
 * extension has almost no users. This view stays platform-agnostic on purpose
 * so widening later is cheap - but don't, without a product decision
 * (see CLAUDE.md, Project Overview).
 */
import {
  getSyncData,
  IS_ANDROID,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { SyncData } from "@src/dataInterface/syncData";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import BreathingExercise from "@src/shared/components/interaction/breathingExercise/BreathingExercise";
import Sun from "@src/shared/components/interaction/sun/Sun";
import { Ico } from "@src/shared/components/ui/Ico";
import Btn from "@src/shared/components/ui/Btn";
import {
  CALM_READ_PASSAGES,
  GRATITUDE_PROMPTS,
  SLEEP_TIPS,
  TOMORROW_PROMPTS,
} from "@src/shared/data/sleepContent";
import { QuestionCategoryId } from "@src/shared/data/questions";
import { getIsoDate } from "@src/util/getIsoDate";
import {
  createEffect,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { setIsShellSunHidden } from "@src/shared/components/interaction/sun/sunStore";
import { BrainDump } from "./activities/BrainDump";
import {
  nightIdToIndex,
  resolveNightId,
  SNOOZE_DURATION_OPTIONS,
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
import { createScreenFade } from "@src/util/screenFade";
// @ts-ignore
import styles from "./SleepWindDownRoute.module.scss";

export type { SleepWindDownDismissReason } from "./sleepWindDownDismissTransition";

// One beat for every view swap inside the wind-down surface; must match the
// opacity transition on .viewPane in SleepWindDownRoute.module.scss.
const VIEW_FADE_MS = 260;

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
  { key: "tomorrow", label: "A note for tomorrow", view: "tomorrow" },
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
   * - main app navigates to dashboard, Android overlay closes the blocked app.
   * `snoozeMinutes` is the chosen duration on the "snooze" path so the host can
   * arm its own timer (Android's little-sun countdown) to the same length.
   */
  onDismiss: (
    reason: SleepWindDownDismissReason,
    snoozeMinutes?: number,
  ) => void;
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
  // Chosen snooze length (minutes), picked on the goodnight gesture. Defaults
  // to the established 15; the picker lets the user ask for a longer pause.
  const [snoozeMinutes, setSnoozeMinutes] = createSignal(SNOOZE_MINUTES);
  // Skip persists its state up front and then routes through the goodnight
  // gesture as a calming exit. We carry the chosen reason here so the moon-
  // drag completion fires onDismiss with the original semantics (skip exits,
  // done locks screen on Android). Snooze bypasses the gesture entirely.
  const [pendingReason, setPendingReason] =
    createSignal<SleepWindDownDismissReason>("done");

  let currentNightId: string | null = null;
  let wrapperEl: HTMLDivElement | undefined;
  let hasOverviewBackCheckpoint = false;
  // Serialize ALL writes through this chain - `updateSyncData` is a full-blob
  // read-modify-write, so concurrent writes silently drop each other's deltas.
  let pendingWritePromise: Promise<void> = Promise.resolve();
  const dismissWithFade = createSleepWindDownDismissTransition({
    getWrapperEl: () => wrapperEl,
    onDismiss: props.onDismiss,
  });

  // Crossfade between the wind-down views via the shared helper instead of
  // hard-cutting the outgoing view: fade the pane out, swap the view at the
  // hidden midpoint, ease back in. Matches the transition on .viewPane.
  const screenFade = createScreenFade(VIEW_FADE_MS);
  // Where the user has navigated, updated synchronously - the rendered view()
  // lags behind by the crossfade's hidden midpoint, so navigation decisions
  // (the back checkpoint, the same-view guard) must not read the stale view()
  // or a back press landing mid-fade gets judged against the outgoing view.
  let logicalView: SleepWindDownViewName = "prompt";

  // The goodnight gesture brings its own disc - the moon as the centrepiece of
  // the night sky. There is only ever one, so the shell's companion moon yields
  // (a soft fade on its own layer, keyed to the rendered view so it leaves as
  // the gesture fades in) and is revealed again on the way out.
  createEffect(() => {
    const v = view();
    setIsShellSunHidden(
      v === "snoozeGoodnight" || v === "goodnight" ? "soft" : false,
    );
  });
  onCleanup(() => setIsShellSunHidden(false));

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
    const currentView = logicalView;
    if (nextView === currentView) return;
    const isReturningToOverview =
      nextView === WIND_DOWN_OVERVIEW_VIEW &&
      hasOverviewBackCheckpoint &&
      shouldBackReturnToWindDownOverview(currentView);

    if (shouldBackReturnToWindDownOverview(nextView)) {
      pushOverviewBackCheckpoint();
    }

    logicalView = nextView;
    screenFade.toScreen(() => {
      setView(nextView);

      if (isReturningToOverview) {
        hasOverviewBackCheckpoint = false;
        window.history.back();
      }
    });
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
        shouldBackReturnToWindDownOverview(logicalView)
      ) {
        hasOverviewBackCheckpoint = false;
        logicalView = WIND_DOWN_OVERVIEW_VIEW;
        screenFade.toScreen(() => setView(WIND_DOWN_OVERVIEW_VIEW));
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
    const minutes = snoozeMinutes();
    if (!props.isPreview) {
      await enqueueWrite(async () => {
        await updateSyncData({
          sleepWindDownSnoozeUntilTS: Date.now() + minutes * 60 * 1000,
        });
      });
    }
    // Snooze returns the user to whatever they were doing without the moon-
    // drag gesture. On Android the host turns this deadline into the regular
    // little-sun countdown.
    await dismissWithFade("snooze", minutes);
  };

  const enterGoodnight = () => {
    setPendingReason("done");
    goToView("goodnight");
  };

  const getGoodnightMoonLabel = () =>
    view() === "snoozeGoodnight"
      ? `Snooze for ${snoozeMinutes()} minutes`
      : "Let the day go";

  const handleGoodnightMoonAction = () => {
    if (view() === "snoozeGoodnight") void snooze();
    else void completeGoodnight();
  };

  const activityActions = (activityKey: ActivityKey): JSX.Element => {
    const action = getSleepWindDownActivityAction(activityKey);

    return (
      <div class={styles.activityActions}>
        <Btn
          outline
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
        </Btn>
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
      {/* One persistent pane: createScreenFade drives its opacity (inline) so
          each view swap eases out and back in instead of the old keyed remount,
          which faded the new view in but hard-cut the old one away. */}
      <div class={styles.viewPane} style={{ opacity: screenFade.opacity() }}>
        <Switch>
          <Match when={view() === "prompt"}>
            <div class={styles.center}>
              <h2 class="h2 h2Mindful">Wind down for sleep?</h2>
              <p class={styles.subtle}>
                It's getting late - would you like to take a moment before bed?
              </p>
              <div class={styles.btnRow}>
                <Btn
                  outline
                  onClick={() => goToView(WIND_DOWN_OVERVIEW_VIEW)}
                  disabled={!hydrated()}
                >
                  Yes
                </Btn>
                <Btn
                  outline
                  onClick={() => goToView("snoozeGoodnight")}
                  disabled={!hydrated()}
                >
                  Snooze
                </Btn>
                <Btn outline onClick={skipTonight} disabled={!hydrated()}>
                  Skip tonight
                </Btn>
              </div>
            </div>
          </Match>

          <Match when={view() === "menu"}>
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
                      <Btn
                        variant="toggle"
                        selected={isDone()}
                        onClick={() => goToView(a.view)}
                        disabled={!hydrated()}
                      >
                        {isDone() && (
                          <span class={styles.activityCheck}>
                            <Ico name="check" />
                          </span>
                        )}
                        <span>{a.label}</span>
                      </Btn>
                    );
                  }}
                </For>
              </div>
              <div class={styles.menuFooter}>
                {/* Always just "Goodnight" - the menu is a calm offering to
                        dip into, not a checklist to complete, so the exit never
                        turns into an "all done" tally. */}
                <Btn onClick={enterGoodnight} disabled={!hydrated()}>
                  Goodnight
                </Btn>
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

          <Match when={view() === "brainDump"}>
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

          <Match when={view() === "gratitude"}>
            <BrainDump
              initialText={gratitudeDraft()}
              prompts={GRATITUDE_PROMPTS}
              questionCategoryId={QuestionCategoryId.Gratitude}
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

          <Match when={view() === "tomorrow"}>
            <BrainDump
              initialText={tomorrowDraft()}
              prompts={TOMORROW_PROMPTS}
              questionCategoryId={QuestionCategoryId.GoodPlans}
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

          <Match when={view() === "breathing"}>
            <div class={styles.activityBody}>
              <BreathingExercise />
              {activityActions("breathing")}
            </div>
          </Match>

          <Match when={view() === "calmRead"}>
            <div class={styles.activityBody}>
              <p class={styles.calmRead}>{calmReadPassage()}</p>
              {activityActions("calmRead")}
            </div>
          </Match>

          <Match when={view() === "tips"}>
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

          {/* Both goodnight variants share one block so there is only ever
                  one moon in the tree: the disc stays mounted across the
                  snooze/goodnight pair (only the copy and gesture props swap),
                  never unmounting to reappear as a second instance. */}
          <Match when={view() === "snoozeGoodnight" || view() === "goodnight"}>
            <div class={styles.goodnightGesture}>
              {/* starsVariant pinned: this gesture's sky is always the deep
                  night wash (see the route's var overrides), even when the
                  wind-down starts before the app's 19:00 dark boundary. */}
              <BackgroundTransition
                isSunGradientAttached={false}
                starsVariant="night"
              />
              <div class={styles.goodnightContent}>
                <h2 class="h2 h2Mindful" style={{ margin: 0 }}>
                  {view() === "snoozeGoodnight"
                    ? `${snoozeMinutes()} more minutes`
                    : "Sleep well"}
                </h2>
                <Show when={view() === "snoozeGoodnight"}>
                  <div class={styles.durationRow}>
                    <For each={SNOOZE_DURATION_OPTIONS}>
                      {(mins) => (
                        <Btn
                          variant="toggle"
                          small
                          selected={snoozeMinutes() === mins}
                          onClick={() => setSnoozeMinutes(mins)}
                          disabled={!hydrated()}
                        >
                          {mins} min
                        </Btn>
                      )}
                    </For>
                  </div>
                </Show>
                <p class={styles.subtle}>
                  {view() === "snoozeGoodnight"
                    ? IS_ANDROID
                      ? "Triple-tap to snooze, or drag the moon down to sleep now."
                      : "Triple-tap to confirm."
                    : "Drag the moon down to let the day go."}
                </p>
                <div class={styles.moonContainer}>
                  <Show when={view() === "snoozeGoodnight"}>
                    <Btn
                      plain
                      voice
                      class="a11yAlternateAction"
                      onClick={() => void completeGoodnight()}
                    >
                      sleep now
                    </Btn>
                  </Show>
                  <Sun
                    variant="moon"
                    aria-label={getGoodnightMoonLabel()}
                    onKeyboardActivate={handleGoodnightMoonAction}
                    completionDirection="down"
                    isTapEnabled={view() === "snoozeGoodnight"}
                    tapThreshold={3}
                    isDragEnabled={IS_ANDROID || view() === "goodnight"}
                    onSkip={handleGoodnightMoonAction}
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
    </div>
  );
};

export default SleepWindDownView;

import { createSignal, For, JSX, Match, onMount, Show, Switch } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import {
  getSyncData,
  updateSyncData,
} from "@src/dataInterface/commonSyncDataInterface";
import { DEFAULT_SLEEP_WIND_DOWN } from "@src/dataInterface/syncData.const";
import { resolveNightId, SNOOZE_MINUTES } from "./sleepWindDown.util";
import {
  dismissSleepWindDownNotification,
  refreshSleepWindDownAlarms,
} from "./androidBridge";
import { getIsoDate } from "@src/util/getIsoDate";
import { Ico } from "@src/shared/components/ui/Ico";
import { BrainDump } from "./activities/BrainDump";
import BreathingExercise from "@src/shared/components/interaction/breathingExercise/BreathingExercise";
import { CALM_READ_TEXT, SLEEP_TIPS } from "@src/shared/data/sleepContent";
import BackgroundTransition from "@src/shared/components/interaction/backgroundTransition/BackgroundTransition";
import Sun from "@src/shared/components/interaction/sun/Sun";
// @ts-ignore
import styles from "./SleepWindDownRoute.module.scss";

type View =
  | "prompt"
  | "menu"
  | "brainDump"
  | "breathing"
  | "calmRead"
  | "tips"
  | "goodnight";

type ActivityKey = "brainDump" | "breathing" | "calmRead" | "tips";

const ACTIVITIES: { key: ActivityKey; label: string; view: View }[] = [
  { key: "brainDump", label: "Gentle brain dump", view: "brainDump" },
  { key: "breathing", label: "Breathing exercise", view: "breathing" },
  { key: "calmRead", label: "Something calm to read", view: "calmRead" },
];

/**
 * Resolve the night id from the user's saved cfg. We always read the latest
 * config rather than caching the value, because a stale `null` would cause
 * dismiss/snooze to silently no-op. Falls back to today's local iso date if
 * cfg is missing — better to over-record than to skip recording the dismissal.
 */
const resolveNightIdFromStorage = async (): Promise<string> => {
  const sd = await getSyncData();
  const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
  return resolveNightId(cfg) ?? getIsoDate();
};

export const SleepWindDownRoute = (): JSX.Element => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPreview = () => searchParams.preview === "1";
  const [view, setView] = createSignal<View>("prompt");
  const [completed, setCompleted] = createSignal<Set<ActivityKey>>(new Set());
  const [brainDumpDraft, setBrainDumpDraft] = createSignal("");
  const [hydrated, setHydrated] = createSignal(false);

  let currentNightId: string | null = null;
  let draftPersistPromise: Promise<void> = Promise.resolve();

  onMount(async () => {
    // The user is now attending to the wind-down — clear any heads-up that
    // brought them here so it doesn't sit in the shade for the rest of the
    // night.
    dismissSleepWindDownNotification();

    const sd = await getSyncData();
    const cfg = sd.cfg.sleepWindDown ?? DEFAULT_SLEEP_WIND_DOWN;
    currentNightId = resolveNightId(cfg);
    if (currentNightId && sd.sleepWindDownProgressNightId === currentNightId) {
      setCompleted(new Set(sd.sleepWindDownCompleted as ActivityKey[]));
      setBrainDumpDraft(sd.sleepWindDownBrainDumpDraft ?? "");
    }
    setHydrated(true);
  });

  const persistCompleted = async (next: Set<ActivityKey>) => {
    if (isPreview()) return;
    const nightId = currentNightId ?? (await resolveNightIdFromStorage());
    currentNightId = nightId;
    await updateSyncData({
      sleepWindDownProgressNightId: nightId,
      sleepWindDownCompleted: Array.from(next),
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

  const persistDraft = (text: string) => {
    if (isPreview()) return;
    const nextPersist = draftPersistPromise
      .catch(() => undefined)
      .then(async () => {
        const nightId = currentNightId ?? (await resolveNightIdFromStorage());
        currentNightId = nightId;
        await updateSyncData({
          sleepWindDownProgressNightId: nightId,
          sleepWindDownBrainDumpDraft: text,
        });
      });
    draftPersistPromise = nextPersist.catch((e) => {
      console.warn("Failed to persist sleep wind-down draft", e);
    });
  };

  const completeBrainDump = async () => {
    const next = new Set(completed());
    next.add("brainDump");
    setCompleted(next);
    setBrainDumpDraft("");

    if (!isPreview()) {
      await draftPersistPromise;
      const nightId = currentNightId ?? (await resolveNightIdFromStorage());
      currentNightId = nightId;
      await updateSyncData({
        sleepWindDownProgressNightId: nightId,
        sleepWindDownCompleted: Array.from(next),
        sleepWindDownBrainDumpDraft: "",
      });
    }

    setView("menu");
  };

  const dismissForTonight = async () => {
    if (isPreview()) {
      // Preview mode (entered via "Try wind-down now") never persists; we
      // don't want a daytime preview to suppress tonight's real window.
      navigate("/");
      return;
    }
    const nightId = await resolveNightIdFromStorage();
    await updateSyncData({
      sleepWindDownDismissedNightId: nightId,
      // Clear the in-progress fields so tomorrow night starts fresh.
      sleepWindDownProgressNightId: "",
      sleepWindDownCompleted: [],
      sleepWindDownBrainDumpDraft: "",
      // Any past snooze deadline is moot now.
      sleepWindDownSnoozeUntilTS: 0,
    });
    // Re-arm (don't cancel) so tomorrow's alarm is still scheduled.
    // The alarm receiver gates on dismissedNightId and will skip tonight.
    refreshSleepWindDownAlarms();
    navigate("/");
  };

  const snooze = async () => {
    if (isPreview()) {
      navigate("/");
      return;
    }
    await updateSyncData({
      sleepWindDownSnoozeUntilTS: Date.now() + SNOOZE_MINUTES * 60 * 1000,
    });
    // Re-arm the alarm at the snooze time. The scheduler picks min(snooze,
    // next bedtime), so the alarm will fire at the snooze deadline.
    refreshSleepWindDownAlarms();
    navigate("/");
  };

  const enterGoodnight = () => {
    setView("goodnight");
  };

  return (
    <div class={`${styles.wrapper} pageTransitionIn`}>
      <Show when={view()} keyed>
        {(currentView) => (
          <div class={styles.viewPane}>
            <Switch>
              <Match when={currentView === "prompt"}>
                <div class={styles.center}>
                  <h2 class="h2">Wind down for sleep?</h2>
                  <p class={styles.subtle}>
                    It's getting late — would you like to take a moment before
                    bed?
                  </p>
                  <div class={styles.btnRow}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => setView("menu")}
                      disabled={!hydrated()}
                    >
                      Yes
                    </button>
                    <button
                      class="btnTxtOutline"
                      onClick={snooze}
                      disabled={!hydrated()}
                    >
                      Snooze 30 min
                    </button>
                    <button
                      class="btnTxtOutline"
                      onClick={dismissForTonight}
                      disabled={!hydrated()}
                    >
                      Skip tonight
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "menu"}>
                <div class={styles.menu}>
                  <h2 class="h2">Choose anything that helps</h2>
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
                            onClick={() => setView(a.view)}
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
                    onClick={() => setView("tips")}
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
                    persistDraft(t);
                  }}
                  onBeforeSubmit={() => draftPersistPromise}
                  onDone={completeBrainDump}
                />
              </Match>

              <Match when={currentView === "breathing"}>
                <div class={styles.activityBody}>
                  <BreathingExercise />
                  <div class={styles.activityActions}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => {
                        markComplete("breathing");
                        setView("menu");
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "calmRead"}>
                <div class={styles.activityBody}>
                  <p class={styles.calmRead}>{CALM_READ_TEXT}</p>
                  <div class={styles.activityActions}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => {
                        markComplete("calmRead");
                        setView("menu");
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "tips"}>
                <div class={styles.activityBody}>
                  <h2 class={`h2 ${styles.activityTitle}`}>
                    Tips for good sleep
                  </h2>
                  <ul class={styles.tipsList}>
                    <For each={SLEEP_TIPS}>{(tip) => <li>{tip}</li>}</For>
                  </ul>
                  <div class={styles.activityActions}>
                    <button
                      class="btnTxtOutline"
                      onClick={() => {
                        markComplete("tips");
                        setView("menu");
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </Match>

              <Match when={currentView === "goodnight"}>
                <div class={styles.goodnightGesture}>
                  <BackgroundTransition />
                  <div class={styles.goodnightContent}>
                    <h2 class="h2" style={{ margin: 0 }}>
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
                        onSkip={dismissForTonight}
                        onFlingAway={dismissForTonight}
                        onDragComplete={dismissForTonight}
                        onStartBackgroundAnimation={(direction) => {
                          window.dispatchEvent(
                            new CustomEvent("startBackgroundAnimation", {
                              detail: { direction },
                            }),
                          );
                        }}
                      />
                    </div>
                    <button
                      class={`btnTxtOutline ${styles.goodnightDone}`}
                      onClick={dismissForTonight}
                    >
                      Done
                    </button>
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

export default SleepWindDownRoute;
